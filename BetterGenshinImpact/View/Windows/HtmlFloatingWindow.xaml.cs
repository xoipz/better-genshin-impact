using System;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media.Animation;
using BetterGenshinImpact.Helpers;
using Microsoft.Web.WebView2.Core;
using Vanara.PInvoke;
using System.Diagnostics;
using System.Windows.Threading;
using System.Windows.Media;

namespace BetterGenshinImpact.View.Windows;

public partial class HtmlFloatingWindow : Window
{
    private bool _isDragging;
    private Point _dragStartPoint;
    private bool _isInteractive = false; // 是否处于交互模式
    private readonly string _windowId;
    private bool _rememberPosition;
    private TaskCompletionSource<bool> _initializationComplete = new();
    private bool _isClosing = false;
    private DispatcherTimer? _lockButtonFadeTimer; // 锁定按钮自动淡出计时器
    private DispatcherTimer? _focusTimer; // 焦点检测定时器
    
    public string WindowId => _windowId;
    public event Action<string>? OnWindowClosed;

    public HtmlFloatingWindow(string id, bool rememberPosition = false)
    {
        InitializeComponent();
        _windowId = id;
        _rememberPosition = rememberPosition;
        
        ShowActivated = false; // 不自动获取焦点
        Loaded += OnLoaded;
        
        // 启动焦点检测定时器（更频繁的检测以提高响应性）
        _focusTimer = new DispatcherTimer();
        _focusTimer.Interval = TimeSpan.FromMilliseconds(100);
        _focusTimer.Tick += CheckFocus;
        _focusTimer.Start();
        
        // 初始化锁定按钮淡出计时器
        _lockButtonFadeTimer = new DispatcherTimer();
        _lockButtonFadeTimer.Interval = TimeSpan.FromSeconds(1);
        _lockButtonFadeTimer.Tick += OnLockButtonFadeTimeout;
        
        // 绑定应用程序退出事件
        Application.Current.Exit += OnAppExit;
    }
    
    private void OnAppExit(object sender, ExitEventArgs e)
    {
        _isClosing = true;
        Close();
    }
    
    // 焦点检测状态 - 默认为false，只有在白名单进程时才显示
    private bool _isVisible = false;

    private void CheckFocus(object? sender, EventArgs e)
    {
        if (_isClosing) return;
        if (Application.Current == null) return; // 应用正在关闭

        var fgHwnd = User32.GetForegroundWindow();
        if (fgHwnd == IntPtr.Zero) return;

        bool shouldShow = false;
        string? activeProcessName = null;

        try
        {
            // 获取前台窗口进程ID
            _ = User32.GetWindowThreadProcessId(fgHwnd, out var pid);
            using var process = Process.GetProcessById((int)pid);
            activeProcessName = process.ProcessName.ToLower();

            // 如果前台是原神、BGI自身、或者本悬浮窗、或者浮动按钮
            // 常见原神进程名：YuanShen, GenshinImpact
            if (activeProcessName.Contains("yuanshen") ||
                activeProcessName.Contains("genshin") ||
                activeProcessName.Contains("bettergi") ||
                activeProcessName.Contains("bettergenshinimpact"))
            {
                shouldShow = true;
            }

            // 如果鼠标在窗口内，始终显示（即使前台不是原神）
            if (IsMouseOver) shouldShow = true;
        }
        catch (Exception)
        {
            // 进程访问可能失败（进程已结束等），保守策略：保持当前状态
            return;
        }

        // 调试日志：当可见性改变时记录原因
        if (shouldShow != _isVisible)
        {
            Serilog.Log.Information("BGI悬浮窗可见性改变: {Old} -> {New} (前台进程: {App})", _isVisible, shouldShow, activeProcessName ?? "未知");
            _isVisible = shouldShow;

            // 使用 BeginInvoke 避免阻塞定时器
            Application.Current?.Dispatcher.BeginInvoke(() =>
            {
                // 检查窗口是否已关闭
                if (_isClosing) return;

                if (_isVisible)
                {
                    // 显示窗口
                    Visibility = Visibility.Visible;
                    var sb = FindResource("WindowFadeIn") as Storyboard;
                    sb?.Begin(this);
                }
                else
                {
                    // 隐藏窗口
                    var sb = FindResource("WindowFadeOut") as Storyboard;
                    sb?.Begin(this);
                    // 淡出后设置不可见
                    Task.Delay(200).ContinueWith(_ =>
                    {
                        Application.Current?.Dispatcher.BeginInvoke(() =>
                        {
                            if (_isClosing) return; // 检查窗口是否已关闭
                            if (!_isVisible) // 再次检查状态，防止快速切换
                            {
                                Visibility = Visibility.Collapsed;
                            }
                        });
                    });
                }
            });
        }
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            // 初始化WebView2
            await WebView.EnsureCoreWebView2Async();
            
            // 设置WebView2选项
            WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            WebView.CoreWebView2.Settings.AreDevToolsEnabled = true; // 允许调试
            
            // 初始化点击穿透状态（默认不穿透，方便交互）
            SetClickThrough(false);
            
            // 从Alt+Tab列表中隐藏
            RemoveFromAltTab();
            
            // 如果需要记住位置，尝试恢复
            if (_rememberPosition)
            {
                RestorePosition();
            }
            
            // 标记初始化完成
            _initializationComplete.TrySetResult(true);
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "HtmlFloatingWindow初始化失败");
            _initializationComplete.TrySetResult(false);
        }
    }

    protected override void OnSourceInitialized(EventArgs e)
    {
        base.OnSourceInitialized(e);
        RemoveFromAltTab();
        
        // 添加消息钩子以处理点击测试
        var source = PresentationSource.FromVisual(this) as HwndSource;
        source?.AddHook(WndProc);
    }
    
    /// <summary>
    /// 窗口消息处理 - 让标题栏在穿透模式下仍可点击
    /// </summary>
    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        const int WM_NCHITTEST = 0x0084;
        const int HTCLIENT = 1;
        const int HTTRANSPARENT = -1;
        
        if (msg == WM_NCHITTEST && _isInteractive)
        {
            // 在穿透模式下，检查鼠标是否在标题栏区域
            var screenPoint = new Point(
                (short)(lParam.ToInt32() & 0xFFFF),
                (short)((lParam.ToInt32() >> 16) & 0xFFFF)
            );
            
            var clientPoint = PointFromScreen(screenPoint);
            
            // 如果鼠标在标题栏范围内，允许交互
            if (TitleBarBorder != null && clientPoint.Y >= 0 && clientPoint.Y <= TitleBarBorder.ActualHeight)
            {
                handled = true;
                return new IntPtr(HTCLIENT);
            }
            
            // 其他区域穿透
            handled = true;
            return new IntPtr(HTTRANSPARENT);
        }
        
        return IntPtr.Zero;
    }

    /// <summary>
    /// 从Alt+Tab列表中移除
    /// </summary>
    private void RemoveFromAltTab()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;
        
        var exStyle = User32.GetWindowLong(hwnd, User32.WindowLongFlags.GWL_EXSTYLE);
        User32.SetWindowLong(hwnd, User32.WindowLongFlags.GWL_EXSTYLE, 
            exStyle | (int)User32.WindowStylesEx.WS_EX_TOOLWINDOW);
    }

    /// <summary>
    /// 设置点击穿透（通过WM_NCHITTEST消息控制）
    /// </summary>
    private void SetClickThrough(bool enable)
    {
        // 不再使用 WS_EX_TRANSPARENT，因为它会让整个窗口穿透，包括标题栏
        // 现在完全依靠 WndProc 中的 WM_NCHITTEST 来精确控制哪些区域穿透
        // 这样标题栏可以保持可点击，而内容区穿透
        Serilog.Log.Information("HTML浮窗 [{Id}] SetClickThrough: {Enable} (使用WM_NCHITTEST控制)", _windowId, enable);
    }


    #region 标题栏动画

    private void OnMouseEnter(object sender, MouseEventArgs e)
    {
        // 穿透模式下不执行hover动画（标题栏应始终显示）
        if (_isInteractive) return;
        
        var showAnimation = FindResource("ShowTitleBar") as Storyboard;
        showAnimation?.Begin();
    }

    private void OnMouseLeave(object sender, MouseEventArgs e)
    {
        // 穿透模式下不执行hover动画（标题栏应始终显示）
        if (_isInteractive) return;
        
        var hideAnimation = FindResource("HideTitleBar") as Storyboard;
        hideAnimation?.Begin();
    }

    #endregion

    #region 标题栏拖拽

    private void OnTitleBarMouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == System.Windows.Input.MouseButtonState.Pressed)
        {
            _isDragging = true;
            _dragStartPoint = e.GetPosition(this);
        }
    }

    private void OnTitleBarMouseMove(object sender, MouseEventArgs e)
    {
        if (_isDragging && e.LeftButton == System.Windows.Input.MouseButtonState.Pressed)
        {
            try
            {
                DragMove();
            }
            catch
            {
                // 忽略拖拽异常
            }
        }
    }

    private void OnTitleBarMouseUp(object sender, MouseButtonEventArgs e)
    {
        _isDragging = false;
        
        // 保存位置
        if (_rememberPosition)
        {
            SavePosition();
        }
    }
    
    private void OnTitleBarMouseEnter(object sender, MouseEventArgs e)
    {
        // hover到标题栏时，如果在穿透模式，重置淡出计时器并恢复按钮可见
        if (_isInteractive)
        {
            _lockButtonFadeTimer?.Stop();
            var fadeIn = FindResource("LockButtonFadeIn") as Storyboard;
            fadeIn?.Begin(this);
        }
    }
    
    private void OnTitleBarMouseLeave(object sender, MouseEventArgs e)
    {
        // 离开标题栏时，如果在穿透模式，重新启动淡出计时器
        if (_isInteractive)
        {
            _lockButtonFadeTimer?.Start();
        }
    }

    #endregion

    #region 按钮事件

    private void OnMinimizeClick(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }
    
    
    /// <summary>
    /// 设置锁定状态（程序化控制穿透模式）
    /// </summary>
    /// <param name="locked">true=启用穿透，false=禁用穿透</param>
    public void SetLocked(bool locked)
    {
        UIDispatcherHelper.Invoke(() =>
        {
            if (_isInteractive != locked)
            {
                ToggleClickThrough();
            }
        });
    }
    
    /// <summary>
    /// 切换穿透模式
    /// </summary>
    private void ToggleClickThrough()
    {
        _isInteractive = !_isInteractive;
        SetClickThrough(_isInteractive);
        
        // 更新按钮状态和标题栏可见性
        UIDispatcherHelper.Invoke(() =>
        {
            LockButton.Content = _isInteractive ? "🔒" : "🔓";
            LockButton.ToolTip = _isInteractive ? "点击禁用穿透" : "点击启用穿透";
            
            // 穿透模式下的简化UI
            if (_isInteractive)
            {
                // 1. 禁用WebView命中测试，确保点击穿透到Window
                WebView.IsHitTestVisible = false;
                
                // 2. 背景透明 (锁定悬浮时)
                ContainerBorder.Background = Brushes.Transparent;
                
                // 3. 禁止调整大小
                ResizeMode = ResizeMode.NoResize;

                // 显示标题栏，使用完全透明背景
                TitleBarBorder.Opacity = 1.0;
                TitleBarBorder.Visibility = Visibility.Visible;
                TitleBarBorder.Background = Brushes.Transparent;
                
                // 只显示锁定按钮，隐藏其他元素
                TitleText.Visibility = Visibility.Collapsed;
                LockButton.Visibility = Visibility.Visible;
                LockButton.Opacity = 1.0;
                
                Serilog.Log.Information("HTML浮窗 [{Id}] 穿透模式UI: 仅显示锁定按钮", _windowId);
            }
            else
            {
                // 恢复正常模式
                WebView.IsHitTestVisible = true;
                
                // 给解锁的背景一个灰色的效果 (0.2) -> #33000000
                ContainerBorder.Background = new SolidColorBrush(Color.FromArgb(51, 0, 0, 0));
                
                // 允许调整大小
                ResizeMode = ResizeMode.CanResize;

                // 非穿透模式：恢复完整UI
                TitleBarBorder.Opacity = 0;
                TitleBarBorder.Background = new SolidColorBrush(Color.FromArgb(0xCC, 0x1a, 0x1a, 0x1a));
                
                // 显示所有元素
                TitleText.Visibility = Visibility.Visible;
                LockButton.Visibility = Visibility.Visible;
                LockButton.Opacity = 1.0;
            }
            
            // 确保不执行淡出
            _lockButtonFadeTimer?.Stop();
        });
        
        Serilog.Log.Information("HTML浮窗 [{Id}] 穿透模式: {Mode}", _windowId, _isInteractive ? "已启用" : "已禁用");
    }
    
    /// <summary>
    /// 锁定按钮淡出超时（已废弃 - 穿透模式下无法响应hover）
    /// </summary>
    private void OnLockButtonFadeTimeout(object? sender, EventArgs e)
    {
        // 穿透模式下鼠标事件会穿透，无法实现hover恢复
        // 因此不再自动隐藏锁定按钮
    }

    private void OnLockClick(object sender, RoutedEventArgs e)
    {
        ToggleClickThrough();
    }

    private void OnCloseClick(object sender, RoutedEventArgs e)
    {
        OnWindowClosed?.Invoke(_windowId);
        Close();
    }

    #endregion

    #region 内容加载

    public async void LoadHtml(string htmlContent)
    {
        // 等待WebView2初始化完成
        await _initializationComplete.Task;
        
        UIDispatcherHelper.Invoke(() =>
        {
            WebView.NavigateToString(htmlContent);
        });
    }

    public async void LoadUrl(string url)
    {
        // 等待WebView2初始化完成
        await _initializationComplete.Task;
        
        UIDispatcherHelper.Invoke(() =>
        {
            WebView.Source = new Uri(url);
        });
    }

    public async void LoadFile(string filePath)
    {
        // 等待WebView2初始化完成
        await _initializationComplete.Task;
        
        UIDispatcherHelper.Invoke(() =>
        {
            var absolutePath = System.IO.Path.GetFullPath(filePath);
            WebView.Source = new Uri($"file:///{absolutePath.Replace("\\", "/")}");
        });
    }

    #endregion

    #region 全局变量读写

    public async Task<string> GetGlobalAsync(string varName)
    {
        try
        {
            await _initializationComplete.Task;

            var app = Application.Current;
            if (app == null || _isClosing) return "null";

            // 使用 InvokeAsync 避免死锁
            var script = $"JSON.stringify(window.{varName})";
            var result = await app.Dispatcher.InvokeAsync(async () =>
            {
                return await WebView.ExecuteScriptAsync(script);
            }).Task.Unwrap();
            return result;
        }
        catch (Exception ex)
        {
            // 在关闭过程中忽略错误
            if (!_isClosing)
                Serilog.Log.Error(ex, "GetGlobal失败");
            return "null";
        }
    }

    public async Task SetGlobalAsync(string varName, string jsonValue)
    {
        try
        {
            await _initializationComplete.Task;

            var app = Application.Current;
            if (app == null || _isClosing) return;

            // 使用 InvokeAsync 避免死锁
            var script = $"window.{varName} = {jsonValue}";
            await app.Dispatcher.InvokeAsync(async () =>
            {
                await WebView.ExecuteScriptAsync(script);
            }).Task.Unwrap();
        }
        catch (Exception ex)
        {
            if (!_isClosing)
                Serilog.Log.Error(ex, "SetGlobal失败");
        }
    }

    public async Task<string> EvalAsync(string expression)
    {
        try
        {
            await _initializationComplete.Task;

            var app = Application.Current;
            if (app == null || _isClosing) return "null";

            // 使用 InvokeAsync 避免死锁
            var result = await app.Dispatcher.InvokeAsync(async () =>
            {
                return await WebView.ExecuteScriptAsync(expression);
            }).Task.Unwrap();
            return result;
        }
        catch (Exception ex)
        {
            if (!_isClosing)
                Serilog.Log.Error(ex, "Eval失败");
            return "null";
        }
    }

    #endregion

    #region 窗口控制

    public void SetTitle(string title)
    {
        UIDispatcherHelper.Invoke(() =>
        {
            TitleText.Text = title;
        });
    }

    public void SetWindowPosition(double x, double y)
    {
        UIDispatcherHelper.Invoke(() =>
        {
            Left = x;
            Top = y;
        });
    }

    public void SetWindowSize(double width, double height)
    {
        UIDispatcherHelper.Invoke(() =>
        {
            Width = width;
            Height = height;
        });
    }

    #endregion

    #region 位置记忆

    private void SavePosition()
    {
        try
        {
            lock (_positionCacheLock)
            {
                if (!_positionCache.ContainsKey(_windowId))
                {
                    _positionCache[_windowId] = new WindowPosition();
                }

                _positionCache[_windowId].X = Left;
                _positionCache[_windowId].Y = Top;
                _positionCache[_windowId].Width = Width;
                _positionCache[_windowId].Height = Height;
            }
        }
        catch (Exception ex)
        {
            Serilog.Log.Debug(ex, "保存窗口位置失败");
        }
    }

    private void RestorePosition()
    {
        try
        {
            lock (_positionCacheLock)
            {
                if (_positionCache.TryGetValue(_windowId, out var pos))
                {
                    Left = pos.X;
                    Top = pos.Y;
                    Width = pos.Width;
                    Height = pos.Height;
                }
            }
        }
        catch (Exception ex)
        {
            Serilog.Log.Debug(ex, "恢复窗口位置失败");
        }
    }

    private static readonly System.Collections.Generic.Dictionary<string, WindowPosition> _positionCache = new();
    private static readonly object _positionCacheLock = new();

    private class WindowPosition
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Width { get; set; }
        public double Height { get; set; }
    }

    #endregion

    protected override void OnClosed(EventArgs e)
    {
        // 先设置关闭标志，避免其他代码在关闭过程中执行不必要的操作
        _isClosing = true;

        // 停止所有定时器
        _focusTimer?.Stop();
        _lockButtonFadeTimer?.Stop();

        // 取消订阅应用退出事件，避免内存泄漏
        if (Application.Current != null)
        {
            Application.Current.Exit -= OnAppExit;
        }

        base.OnClosed(e);

        // 保存位置
        if (_rememberPosition)
        {
            SavePosition();
        }

        // 清理WebView2
        WebView?.Dispose();
    }
}
