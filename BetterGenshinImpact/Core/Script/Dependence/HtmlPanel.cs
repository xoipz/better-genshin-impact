using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using BetterGenshinImpact.Core.Config;
using BetterGenshinImpact.Helpers;
using BetterGenshinImpact.View.Windows;

namespace BetterGenshinImpact.Core.Script.Dependence;

/// <summary>
/// HTML浮窗面板API
/// 为JS脚本提供创建和控制HTML浮窗的能力
/// </summary>
public class HtmlPanel
{
    private static readonly Dictionary<string, HtmlFloatingWindow> _windows = new();
    private static readonly object _lock = new();

    /// <summary>
    /// 创建HTML浮窗
    /// </summary>
    /// <param name="id">窗口唯一ID</param>
    /// <param name="width">宽度</param>
    /// <param name="height">高度</param>
    /// <param name="options">选项JSON字符串，例如: {"rememberPosition":true,"defaultX":100,"defaultY":100}</param>
    public void Create(string id, double width = 400, double height = 300, string? options = null)
    {
        UIDispatcherHelper.Invoke(() =>
        {
            lock (_lock)
            {
                // 如果窗口已存在，激活它
                if (_windows.ContainsKey(id))
                {
                    _windows[id].Activate();
                    return;
                }

                // 解析选项
                var opts = ParseOptions(options);

                // 创建窗口
                var window = new HtmlFloatingWindow(id, opts.RememberPosition)
                {
                    Width = width,
                    Height = height,
                    Left = opts.DefaultX,
                    Top = opts.DefaultY
                };

                // 注册关闭事件
                window.OnWindowClosed += (wid) =>
                {
                    lock (_lock)
                    {
                        _windows.Remove(wid);
                    }
                };

                _windows[id] = window;
                window.Show();
                
                Serilog.Log.Information("HTML浮窗创建成功: {Id} ({Width}x{Height})", id, width, height);
            }
        });
    }

    /// <summary>
    /// 加载HTML内容
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="htmlContent">HTML字符串</param>
    public void LoadHtml(string id, string htmlContent)
    {
        ExecuteOnWindow(id, window => window.LoadHtml(htmlContent));
    }

    /// <summary>
    /// 加载URL
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="url">URL地址</param>
    public void LoadUrl(string id, string url)
    {
        ExecuteOnWindow(id, window => window.LoadUrl(url));
    }

    /// <summary>
    /// 加载本地HTML文件
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="filePath">文件路径</param>
    public void LoadFile(string id, string filePath)
    {
        ExecuteOnWindow(id, window => window.LoadFile(filePath));
    }

    /// <summary>
    /// 从文件加载HTML内容
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="filePath">HTML文件路径（相对于脚本目录或绝对路径）</param>
    public void LoadHtmlFile(string id, string filePath)
    {
        // 解析文件路径（支持相对路径）
        string fullPath = System.IO.Path.IsPathRooted(filePath) 
            ? filePath 
            : System.IO.Path.Combine(Global.ScriptPath(), filePath);
        
        if (!System.IO.File.Exists(fullPath))
        {
            throw new System.IO.FileNotFoundException($"HTML文件不存在: {fullPath}");
        }
        
        string htmlContent = System.IO.File.ReadAllText(fullPath);
        LoadHtml(id, htmlContent);
        Serilog.Log.Information("HTML浮窗从文件加载: {Id} <- {File}", id, fullPath);
    }
    
    /// <summary>
    /// 调整窗口大小
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="width">新宽度</param>
    /// <param name="height">新高度</param>
    public void Resize(string id, double width, double height)
    {
        ExecuteOnWindow(id, window =>
        {
            UIDispatcherHelper.Invoke(() =>
            {
                window.Width = width;
                window.Height = height;
                Serilog.Log.Information("HTML浮窗大小已调整: {Id} ({Width}x{Height})", id, width, height);
            });
        });
    }
    
    /// <summary>
    /// 设置窗口穿透模式
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="locked">true=启用穿透，false=禁用穿透</param>
    public void SetLocked(string id, bool locked)
    {
        ExecuteOnWindow(id, window => window.SetLocked(locked));
        Serilog.Log.Information("HTML浮窗穿透模式: {Id} = {Locked}", id, locked);
    }

    /// <summary>
    /// 获取HTML中的全局变量
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="varName">变量名，如 "myVar" 或 "myObject.property"</param>
    /// <returns>JSON字符串</returns>
    public async Task<string> GetGlobal(string id, string varName)
    {
        return await ExecuteOnWindowAsync(id, async window =>
        {
            return await window.GetGlobalAsync(varName);
        }) ?? "null";
    }

    /// <summary>
    /// 设置HTML中的全局变量
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="varName">变量名</param>
    /// <param name="value">值（将被序列化为JSON）</param>
    public async Task SetGlobal(string id, string varName, object value)
    {
        try
        {
            var jsonValue = JsonSerializer.Serialize(value);
            await ExecuteOnWindowAsync(id, async window =>
            {
                await window.SetGlobalAsync(varName, jsonValue);
                return true;
            });
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "SetGlobal序列化失败");
        }
    }

    /// <summary>
    /// 执行JavaScript表达式
    /// </summary>
    /// <param name="id">窗口ID</param>
    /// <param name="expression">JS表达式</param>
    /// <returns>执行结果</returns>
    public async Task<string> Eval(string id, string expression)
    {
        return await ExecuteOnWindowAsync(id, async window =>
        {
            return await window.EvalAsync(expression);
        }) ?? "null";
    }

    /// <summary>
    /// 设置窗口标题
    /// </summary>
    public void SetTitle(string id, string title)
    {
        ExecuteOnWindow(id, window => window.SetTitle(title));
    }

    /// <summary>
    /// 设置窗口位置
    /// </summary>
    public void SetPosition(string id, double x, double y)
    {
        ExecuteOnWindow(id, window => window.SetWindowPosition(x, y));
    }

    /// <summary>
    /// 设置窗口大小
    /// </summary>
    public void SetSize(string id, double width, double height)
    {
        ExecuteOnWindow(id, window => window.SetWindowSize(width, height));
    }

    /// <summary>
    /// 显示窗口
    /// </summary>
    public void Show(string id)
    {
        ExecuteOnWindow(id, window =>
        {
            UIDispatcherHelper.Invoke(() => window.Show());
        });
    }

    /// <summary>
    /// 隐藏窗口
    /// </summary>
    public void Hide(string id)
    {
        ExecuteOnWindow(id, window =>
        {
            UIDispatcherHelper.Invoke(() => window.Hide());
        });
    }

    /// <summary>
    /// 最小化窗口
    /// </summary>
    public void Minimize(string id)
    {
        ExecuteOnWindow(id, window =>
        {
            UIDispatcherHelper.Invoke(() => window.WindowState = WindowState.Minimized);
        });
    }

    /// <summary>
    /// 关闭窗口
    /// </summary>
    public void Close(string id)
    {
        UIDispatcherHelper.Invoke(() =>
        {
            lock (_lock)
            {
                if (_windows.TryGetValue(id, out var window))
                {
                    window.Close();
                    _windows.Remove(id);
                    Serilog.Log.Information("HTML浮窗已关闭: {Id}", id);
                }
            }
        });
    }

    /// <summary>
    /// 关闭所有窗口
    /// </summary>
    public static void CloseAll()
    {
        UIDispatcherHelper.Invoke(() =>
        {
            lock (_lock)
            {
                foreach (var window in _windows.Values)
                {
                    window.Close();
                }
                _windows.Clear();
                Serilog.Log.Information("所有HTML浮窗已关闭");
            }
        });
    }

    #region 辅助方法

    private void ExecuteOnWindow(string id, Action<HtmlFloatingWindow> action)
    {
        lock (_lock)
        {
            if (_windows.TryGetValue(id, out var window))
            {
                try
                {
                    action(window);
                }
                catch (Exception ex)
                {
                    Serilog.Log.Error(ex, "HtmlPanel操作失败 [{Id}]", id);
                }
            }
            else
            {
                Serilog.Log.Warning("HTML浮窗不存在: {Id}", id);
            }
        }
    }

    private async Task<T?> ExecuteOnWindowAsync<T>(string id, Func<HtmlFloatingWindow, Task<T>> func)
    {
        HtmlFloatingWindow? window;
        lock (_lock)
        {
            if (!_windows.TryGetValue(id, out window))
            {
                Serilog.Log.Warning("HTML浮窗不存在: {Id}", id);
                return default;
            }
        }

        try
        {
            return await func(window);
        }
        catch (Exception ex)
        {
            Serilog.Log.Error(ex, "HtmlPanel异步操作失败 [{Id}]", id);
            return default;
        }
    }

    private WindowOptions ParseOptions(string? optionsJson)
    {
        var opts = new WindowOptions();
        
        if (string.IsNullOrWhiteSpace(optionsJson))
        {
            return opts;
        }

        try
        {
            var options = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(optionsJson);
            if (options == null) return opts;

            if (options.TryGetValue("rememberPosition", out var rememberPos))
            {
                opts.RememberPosition = rememberPos.GetBoolean();
            }

            if (options.TryGetValue("defaultX", out var defaultX))
            {
                opts.DefaultX = defaultX.GetDouble();
            }

            if (options.TryGetValue("defaultY", out var defaultY))
            {
                opts.DefaultY = defaultY.GetDouble();
            }
        }
        catch (Exception ex)
        {
            Serilog.Log.Warning(ex, "解析窗口选项失败");
        }

        return opts;
    }

    private class WindowOptions
    {
        public bool RememberPosition { get; set; } = false;
        public double DefaultX { get; set; } = 100;
        public double DefaultY { get; set; } = 100;
    }

    #endregion
}
