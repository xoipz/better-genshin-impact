# JavaScript脚本开发 - HTML浮窗面板

## 概述

BGI（BetterGenshinImpact）提供了一个强大的`htmlPanel`对象，允许JavaScript脚本创建和控制自定义的HTML浮窗。这使得开发者可以为脚本创建丰富的图形用户界面（GUI），显示实时状态、接收用户输入或展示无需切换窗口的信息。

**相关代码位置**: 
- 核心实现: `BetterGenshinImpact\Core\Script\Dependence\HtmlPanel.cs`
- 引擎注册: `BetterGenshinImpact\Core\Script\EngineExtend.cs:39`

---

## htmlPanel 对象

`htmlPanel`对象在脚本环境中自动可用，无需导入。

### 核心方法

#### Create(id, width, height, [options])
创建一个新的HTML浮窗。如果指定ID的窗口已存在，则激活它。

```javascript
// 创建一个400x300的浮窗
htmlPanel.create("myWindow", 400, 300);

// 创建带配置的浮窗
const options = JSON.stringify({
    rememberPosition: true,  // 记住上次位置
    defaultX: 100,           // 默认屏幕X坐标
    defaultY: 100            // 默认屏幕Y坐标
});
htmlPanel.create("configWindow", 500, 400, options);
```

**参数**:
- `id` (string): 窗口的唯一标识符
- `width` (number): 窗口宽度
- `height` (number): 窗口高度
- `options` (string, 可选): JSON格式的配置字符串

#### LoadHtml(id, htmlContent)
向指定窗口加载HTML内容。

```javascript
const html = `
    <html>
    <body>
        <h1>Hello BGI</h1>
        <button onclick="window.chrome.webview.postMessage('clicked')">Click Me</button>
    </body>
    </html>
`;
htmlPanel.loadHtml("myWindow", html);
```

#### LoadUrl(id, url)
向指定窗口加载URL。

```javascript
// 加载本地服务器页面
htmlPanel.loadUrl("myWindow", "http://localhost:8080");

// 加载在线页面（需注意网络权限）
htmlPanel.loadUrl("infoWindow", "https://example.com/guide.html");
```

#### LoadFile(id, filePath)
加载本地HTML文件。路径相对于脚本根目录。

```javascript
htmlPanel.loadFile("myWindow", "ui/index.html");
```

#### LoadHtmlFile(id, filePath)
读取本地文件内容并作为HTML加载（类似于读取文本后调用LoadHtml）。
支持相对路径（相对于脚本目录）。

```javascript
// 读取并加载HTML内容（适合需要预处理或模板替换的场景）
htmlPanel.loadHtmlFile("myWindow", "ui/template.html");
```

#### Resize(id, width, height)
调整窗口大小。

```javascript
htmlPanel.resize("myWindow", 800, 600);
```

#### SetLocked(id, locked)
设置窗口穿透模式。启用穿透后，鼠标事件将穿透窗口（点击无法交互，但可见）。

```javascript
// 开启点击穿透（适合做HUD显示）
htmlPanel.setLocked("hudWindow", true);

// 关闭穿透（允许交互）
htmlPanel.setLocked("hudWindow", false);
```

#### SetTitle(id, title)
设置窗口标题。

```javascript
htmlPanel.setTitle("myWindow", "脚本控制台");
```

#### SetPosition(id, x, y)
设置窗口在屏幕上的位置。

```javascript
htmlPanel.setPosition("myWindow", 0, 0); // 移动到左上角
```

#### SetSize(id, width, height)
设置窗口大小（等同于Resize）。

```javascript
htmlPanel.setSize("myWindow", 500, 300);
```

#### Show(id) / Hide(id)
显示或隐藏窗口。

```javascript
htmlPanel.hide("myWindow"); // 隐藏
await sleep(1000);
htmlPanel.show("myWindow"); // 显示
```

#### Minimize(id)
最小化窗口。

```javascript
htmlPanel.minimize("myWindow");
```

#### Close(id)
关闭指定窗口。

```javascript
htmlPanel.close("myWindow");
```

#### CloseAll()
关闭当前脚本创建的所有HTML浮窗。通常在脚本结束时调用。

```javascript
htmlPanel.closeAll();
```

---

## 数据交互

脚本与HTML浮窗之间可以通过以下方式进行数据交互。

### 脚本 -> HTML (调用JS)

#### Eval(id, expression)
在HTML窗口的上下文中执行JavaScript表达式，并获取返回值（Promise）。

```javascript
// 获取页面标题
const title = await htmlPanel.eval("myWindow", "document.title");
log.info(`页面标题: ${title}`);

// 调用页面内的函数
await htmlPanel.eval("myWindow", "updateStatus('正在运行...')");
```

### 脚本 <-> HTML (共享变量)

#### SetGlobal(id, name, value)
向HTML窗口注入全局变量。值会被序列化为JSON。

```javascript
// 注入配置数据
const config = { speed: 100, mode: "auto" };
await htmlPanel.setGlobal("myWindow", "scriptConfig", config);

// 在HTML中可以通过 window.scriptConfig 访问
```

#### GetGlobal(id, name)
获取HTML窗口中的全局变量值。

```javascript
// 获取用户在页面上的设置
const userSettings = await htmlPanel.getGlobal("myWindow", "currentSettings");
log.info("用户设置:", userSettings);
```

---

## 最佳实践

### 1. 脚本生命周期管理
建议在脚本开始时创建窗口，在脚本结束时清理窗口。

```javascript
try {
    htmlPanel.create("mainUI", 300, 500);
    htmlPanel.loadFile("mainUI", "ui/index.html");
    
    // 脚本主循环...
    
} finally {
    // 脚本结束或出错时关闭窗口
    htmlPanel.closeAll();
}
```

### 2. 创建HUD（抬头显示）
使用`SetLocked(true)`可以创建透明的覆盖层，用于显示信息且不妨碍游戏操作。

```javascript
htmlPanel.create("hud", 1920, 1080);
// 确保背景透明的HTML样式
htmlPanel.loadHtml("hud", "<body style='background:transparent; pointer-events:none;'>...</body>");
htmlPanel.setLocked("hud", true); // 开启穿透
```

### 3. 双向通信示例
在HTML中使用 `chrome.webview.postMessage` 可以向C#宿主发送消息（需配合特定的WebView2桥接，BGI暂未完全开放通用的Message事件监听给JS，目前主要依靠`Eval`和`GetGlobal`进行轮询或主动更新，或者使用`htmlPanel.setGlobal`推送数据）。

*(注意：当前的HtmlPanel API 主要支持 脚本 -> 页面 的单向控制和数据注入，以及 脚本 -> 页面 的数据拉取。页面 -> 脚本 的实时事件通知在当前API中暂未直接暴露给JS回调，通常通过 `GetGlobal` 定时检查状态或由页面修改全局变量来实现反向通信)*

---

## 版本信息
- **文档版本**: v1.1.0
- **最后更新**: 2026年2月4日
- **适用BGI版本**: >=0.60.0

---

## 常见问题排查

> [!WARNING]
> **LoadHtmlFile 路径解析问题**
>
> 在某些BGI版本环境（如v0.45.0至v0.60.0及部分Release版本）中，`htmlPanel.loadHtmlFile(id, filePath)` 可能会因为相对路径解析错误（解析到了BGI程序根目录而非脚本目录）而导致 "Error: HTML文件不存在" 异常。
>
> **解决方案**:
> 推荐使用 `file.readTextSync()` 读取文件内容，然后使用 `htmlPanel.loadHtml()` 加载，以确保路径解析正确（`file` 模块通常能正确解析脚本目录下的相对路径）。
>
> ```javascript
> // ❌ 可能会报错的写法
> // htmlPanel.loadHtmlFile("myPanel", "ui/status.html");
>
> // ✅ 推荐的稳健写法
> const htmlContent = file.readTextSync("ui/status.html");
> if (htmlContent) {
>     htmlPanel.loadHtml("myPanel", htmlContent);
> } else {
>     log.error("无法读取HTML文件");
> }
> ```
