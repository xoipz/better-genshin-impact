# BGI JavaScript脚本项目开发完整指南

## 📖 项目概述

BGI（BetterGenshinImpact）JavaScript脚本项目是一个强大的原神游戏自动化脚本开发平台。基于Microsoft ClearScript V8引擎，提供了丰富的API接口和完善的项目管理体系，让开发者能够轻松创建功能强大的游戏自动化脚本。

---

## 🏗️ 核心架构

### JavaScript引擎核心
- **引擎**: Microsoft ClearScript V8
- **运行时**: .NET环境下的V8 JavaScript引擎
- **异步支持**: Task与Promise自动转换机制
- **安全特性**: 沙箱隔离，严格的文件系统访问控制

### 项目管理体系
- **项目化管理**: 基于manifest.json的项目配置系统
- **模块化支持**: 支持JavaScript模块导入和依赖管理
- **配置管理**: 多层配置系统，支持用户自定义配置
- **生命周期**: 完整的脚本生命周期管理（启动、停止、暂停、恢复）

---

## 📁 标准项目结构

```
脚本项目目录/
├── manifest.json          # 项目清单文件（必需）
├── main.js                # 主脚本文件（必需）
├── README.md              # 项目说明文档（推荐）
├── config/                # 配置文件目录
│   ├── default.json       # 默认配置
│   └── schema.json        # 配置验证模式
├── lib/                   # 库文件目录
│   ├── utils.js           # 工具函数
│   └── modules/           # 功能模块
├── assets/                # 资源文件目录
│   ├── images/            # 图片资源
│   └── data/              # 数据文件
└── docs/                  # 文档目录
    └── api.md             # API文档
```

---

## 🛠️ manifest.json配置详解

### 基础配置
```json
{
  "name": "脚本名称",
  "version": "1.0.0",
  "description": "脚本功能描述",
  "author": {
    "name": "作者姓名",
    "email": "author@example.com"
  },
  "main": "main.js",
  "type": "script"
}
```

### 高级配置
```json
{
  "category": "automation",
  "tags": ["OCR", "自动化", "测试"],
  "created": "2025-08-04",
  "updated": "2025-08-04",
  "requirements": {
    "bgi_version": ">=0.47.0"
  },
  "permissions": [
    "game-control",
    "screen-capture",
    "file-system",
    "notification"
  ],
  "compatibility": {
    "os": ["windows"],
    "resolution": ["1920x1080", "2560x1440"]
  },
  "config": {
    "timeout": 5000,
    "retry_count": 3
  },
  "features": [
    "功能特性1",
    "功能特性2"
  ]
}
```

---

## 🔌 核心API接口

### 全局方法API

#### 延时控制
```javascript
await sleep(1000);  // 暂停1秒
```

#### 键盘操作
```javascript
await keyPress('VK_SPACE');        // 按空格键
await keyDown('VK_W');             // 按下W键
await keyUp('VK_W');               // 释放W键
await inputText('Hello World');     // 输入文本
```

#### 鼠标操作
```javascript
await click(100, 200);             // 左键点击坐标
await rightClick(100, 200);        // 右键点击
await moveMouseTo(100, 200);       // 移动鼠标
await leftButtonDown();            // 按下左键
await leftButtonUp();              // 释放左键
```

#### 游戏设置
```javascript
setGameMetrics(1920, 1080);        // 设置游戏分辨率
```

#### 截图功能
```javascript
var captureRegion = captureGameRegion();  // 截取游戏画面
```

### 原神游戏API

#### 传送系统
```javascript
await genshin.tp(100, 200);        // 传送到坐标
```

#### 地图操作
```javascript
var position = genshin.getPositionFromMap();  // 获取当前位置
await genshin.openMap();           // 打开地图
await genshin.closeMap();          // 关闭地图
```

#### 队伍管理
```javascript
await genshin.switchParty(1);      // 切换到队伍1
```

#### 自动化功能
```javascript
await genshin.autoFishing();       // 自动钓鱼
await genshin.returnMainUi();      // 返回主界面
```

### OCR识别功能

#### 基础OCR识别
```javascript
// 创建OCR识别对象
var ocrObject = RecognitionObject.Ocr(x, y, width, height);

// 执行识别
var captureRegion = captureGameRegion();
var results = await captureRegion.findMulti(ocrObject);

// 处理结果
if (results.count > 0) {
    var text = results[0].text;
    var confidence = results[0].confidence;
    log.info("识别到文本: " + text + ", 置信度: " + confidence);
}
```

#### 简化OCR函数
```javascript
async function easyOCR(region) {
    var ocrObject = RecognitionObject.Ocr(region.X, region.Y, region.WIDTH, region.HEIGHT);
    var captureRegion = captureGameRegion();
    return await captureRegion.findMulti(ocrObject);
}

async function easyOCROne(region) {
    var results = await easyOCR(region);
    return results.count > 0 ? results[0].text.trim() : "";
}
```

### 日志和通知系统

#### 日志记录
```javascript
log.debug("调试信息");
log.info("一般信息");
log.warn("警告信息");
log.error("错误信息");
```

#### 通知推送
```javascript
notification.success("成功", "任务完成！");
notification.error("错误", "执行失败！");
notification.info("信息", "状态更新");
```

#### 文件操作
```javascript
var content = limitedFile.readAllText("config.json");
```

---

## 🔧 Auto自动化功能

### 可用的Auto模块
- **AutoFight**: 自动战斗系统
- **AutoFishing**: 自动钓鱼系统
- **AutoCook**: 自动烹饪功能
- **AutoDomain**: 自动秘境挑战
- **AutoMusicGame**: 自动音游演奏
- **AutoPathing**: 自动路径导航
- **AutoPick**: 自动采集系统
- **AutoSkip**: 自动跳过对话
- **AutoWood**: 自动砍树功能

### 使用示例
```javascript
// 开启自动钓鱼
await genshin.autoFishing();

// 组合使用多个自动化功能
await genshin.autoPick();  // 自动采集
await genshin.autoSkip();  // 自动跳过对话
```

---

## 📦 模块化开发

### 推荐的模块导入方式
```javascript
// 使用eval()方式导入模块（推荐）
eval(limitedFile.readAllText('lib/utils.js'));

// 模块定义（在被导入文件中）
var Utils = {
    formatTime: function(timestamp) {
        return new Date(timestamp).toLocaleString();
    },
    
    validateConfig: function(config) {
        return config && typeof config === 'object';
    }
};
```

### 模块化架构最佳实践
```javascript
// 主文件 main.js
eval(limitedFile.readAllText('lib/config.js'));
eval(limitedFile.readAllText('lib/ocr.js'));
eval(limitedFile.readAllText('lib/automation.js'));

async function main() {
    // 初始化配置
    var config = ConfigModule.load();
    
    // 执行自动化任务
    await AutomationModule.run(config);
}

// 配置模块 lib/config.js
var ConfigModule = {
    load: function() {
        try {
            var content = limitedFile.readAllText('config/default.json');
            return JSON.parse(content);
        } catch (error) {
            log.error("配置加载失败: " + error.message);
            return {};
        }
    }
};
```

---

## 🚫 功能限制

### 网络功能限制
- ❌ fetch(), XMLHttpRequest, WebSocket 等Web API不可用
- ❌ Node.js网络模块不存在

### DOM/BOM限制
- ❌ document, element等浏览器API不存在
- ❌ window, location, history等不可用
- ❌ localStorage, sessionStorage不支持

### 文件系统限制
- 🔒 扩展名白名单: 仅支持.txt, .json, .log, .csv, .xml, .html, .css
- 📏 文件大小限制: 最大999MB
- 🛡️ 路径限制: 仅可访问项目目录内文件

### 模块系统限制
- ⚠️ ES6 modules: import/export语法不稳定支持
- ❓ CommonJS: require()可能出现"not defined"错误

---

## 📝 开发最佳实践

### 错误处理
```javascript
async function safeOperation() {
    try {
        await riskyOperation();
        log.info("操作成功完成");
        notification.success("成功", "操作已完成");
    } catch (error) {
        log.error("操作失败: " + error.message);
        notification.error("错误", "操作失败: " + error.message);
        throw error;  // 重新抛出错误，让上层处理
    }
}
```

### 配置管理
```javascript
var ConfigManager = {
    config: null,
    
    load: function() {
        if (!this.config) {
            try {
                var content = limitedFile.readAllText('config/default.json');
                this.config = JSON.parse(content);
            } catch (error) {
                log.warn("配置文件加载失败，使用默认配置");
                this.config = this.getDefaultConfig();
            }
        }
        return this.config;
    },
    
    get: function(key, defaultValue) {
        var config = this.load();
        var keys = key.split('.');
        var value = config;
        
        for (var i = 0; i < keys.length; i++) {
            if (value && typeof value === 'object' && keys[i] in value) {
                value = value[keys[i]];
            } else {
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    },
    
    getDefaultConfig: function() {
        return {
            general: {
                timeout: 5000,
                retryCount: 3
            },
            ocr: {
                confidence: 0.8
            }
        };
    }
};
```

### 日志记录规范
```javascript
var Logger = {
    logWithPrefix: function(level, message, prefix) {
        var timestamp = new Date().toLocaleString();
        var logMessage = "[" + timestamp + "] [" + (prefix || "SCRIPT") + "] " + message;
        log[level](logMessage);
    },
    
    info: function(message, prefix) {
        this.logWithPrefix('info', message, prefix);
    },
    
    error: function(message, prefix) {
        this.logWithPrefix('error', message, prefix);
    },
    
    debug: function(message, prefix) {
        this.logWithPrefix('debug', message, prefix);
    }
};

// 使用示例
Logger.info("脚本开始执行", "MAIN");
Logger.debug("OCR识别参数: " + JSON.stringify(region), "OCR");
```

### 参数验证
```javascript
function validateOCRRegion(region) {
    if (!region || typeof region !== "object") {
        throw new Error("OCR区域参数必须是对象");
    }
    
    var required = ['X', 'Y', 'WIDTH', 'HEIGHT'];
    for (var i = 0; i < required.length; i++) {
        var prop = required[i];
        if (typeof region[prop] !== 'number' || region[prop] < 0) {
            throw new Error("OCR区域的" + prop + "必须是非负数");
        }
    }
    
    if (region.WIDTH <= 0 || region.HEIGHT <= 0) {
        throw new Error("OCR区域的宽度和高度必须大于0");
    }
    
    return true;
}
```

---

## 🎯 实际项目示例

### 项目示例1: OCR测试脚本

**目录结构:**
```
OCR测试脚本/
├── manifest.json
├── main.js
└── README.md
```

**主要功能:**
- 测试不同宽度参数的OCR识别效果
- 详细的识别结果日志输出
- 完整的错误处理机制
- 可配置的测试参数

**核心代码片段:**
```javascript
// 脚本配置对象
const SCRIPT_CONFIG = {
  name: "OCR识别测试脚本",
  version: "1.0.0",
  testRegion: { X: 796, Y: 293, HEIGHT: 40 },
  testWidths: [100, 200, 300, 400]
};

// 简化OCR识别函数
async function easyOCR(ocrRegion) {
  var locationOcrRo = RecognitionObject.Ocr(
    ocrRegion.X, ocrRegion.Y, 
    ocrRegion.WIDTH, ocrRegion.HEIGHT
  );
  
  var captureRegion = captureGameRegion();
  return await captureRegion.findMulti(locationOcrRo);
}
```

### 项目示例2: 界面初始化测试

**目录结构:**
```
界面初始化测试项目/
├── manifest.json
├── main.js
├── assets/
└── README.md
```

**主要功能:**
- 自动化测试游戏各个界面的初始化
- 包括委托、地图、任务和派蒙界面
- 单文件版本，无需额外配置

**核心代码片段:**
```javascript
async function main() {
    // 回到主界面
    await genshin.returnMainUi();
    
    // 委托界面初始化
    await keyPress('VK_F1');
    await sleep(3000);
    await keyPress('VK_ESCAPE');
    
    // 地图界面初始化
    await keyPress('VK_M');
    await sleep(5000);
    await keyPress('VK_ESCAPE');
}
```

---

## 🔄 项目生命周期管理

### 生命周期钩子
```javascript
// 脚本启动钩子
function onStart() {
    log.info("脚本启动初始化...");
    // 初始化配置
    // 检查环境
    // 准备资源
}

// 脚本停止钩子
function onStop() {
    log.info("脚本停止清理...");
    // 清理资源
    // 保存状态
    // 发送通知
}

// 脚本暂停钩子
function onPause() {
    log.info("脚本已暂停");
    // 保存当前状态
}

// 脚本恢复钩子
function onResume() {
    log.info("脚本已恢复");
    // 恢复状态
}
```

---

## 🐛 调试和测试

### 调试技巧
```javascript
// 调试模式开关
var DEBUG_MODE = true;

function debugLog(message) {
    if (DEBUG_MODE) {
        log.debug("[DEBUG] " + message);
    }
}

// 性能测量
function measureTime(name, func) {
    var start = Date.now();
    var result = func();
    var duration = Date.now() - start;
    debugLog(name + " 耗时: " + duration + "ms");
    return result;
}

// 异步性能测量
async function measureTimeAsync(name, asyncFunc) {
    var start = Date.now();
    var result = await asyncFunc();
    var duration = Date.now() - start;
    debugLog(name + " 耗时: " + duration + "ms");
    return result;
}
```

### 单元测试模式
```javascript
var TestRunner = {
    tests: [],
    
    addTest: function(name, testFunc) {
        this.tests.push({ name: name, func: testFunc });
    },
    
    runAll: function() {
        var passed = 0;
        var failed = 0;
        
        for (var i = 0; i < this.tests.length; i++) {
            var test = this.tests[i];
            try {
                test.func();
                log.info("✓ " + test.name);
                passed++;
            } catch (error) {
                log.error("✗ " + test.name + ": " + error.message);
                failed++;
            }
        }
        
        log.info("测试完成: " + passed + " 通过, " + failed + " 失败");
    }
};

// 添加测试用例
TestRunner.addTest("配置验证测试", function() {
    var config = ConfigManager.load();
    if (!config) throw new Error("配置加载失败");
});

TestRunner.addTest("OCR区域验证测试", function() {
    var region = { X: 100, Y: 100, WIDTH: 50, HEIGHT: 50 };
    validateOCRRegion(region);
});
```

---

## ⚡ 性能优化建议

### 1. 异步操作优化
```javascript
// 避免不必要的等待
// ❌ 不好的做法
await sleep(1000);
await doTask1();
await sleep(1000);  
await doTask2();

// ✅ 更好的做法
await doTask1();
await doTask2();
await sleep(1000);  // 只在必要时等待
```

### 2. OCR识别优化
```javascript
// 缓存OCR对象
var ocrCache = {};

function getOCRObject(region) {
    var key = region.X + "," + region.Y + "," + region.WIDTH + "," + region.HEIGHT;
    if (!ocrCache[key]) {
        ocrCache[key] = RecognitionObject.Ocr(region.X, region.Y, region.WIDTH, region.HEIGHT);
    }
    return ocrCache[key];
}
```

### 3. 内存管理
```javascript
// 清理不用的大对象
function cleanupLargeObjects() {
    // 清理OCR结果缓存
    if (ocrResultCache.size > 100) {
        ocrResultCache.clear();
    }
    
    // 清理日志缓存
    if (logBuffer.length > 1000) {
        logBuffer.splice(0, 500);  // 保留最近500条
    }
}
```

---

## 📚 深入学习资源

### 相关文档
1. **[00-完整代码位置索引](./jshelp/docs/00-完整代码位置索引.md)** - 源码位置索引
2. **[01-全局方法API](./jshelp/docs/01-全局方法API.md)** - 基础API详解
3. **[02-原神游戏API](./jshelp/docs/02-原神游戏API.md)** - 游戏专用API
4. **[03-OCR识别功能](./jshelp/docs/03-OCR识别功能.md)** - OCR功能详解
5. **[04-Auto系列自动化功能](./jshelp/docs/04-Auto系列自动化功能.md)** - 自动化功能
6. **[05-日志和通知系统](./jshelp/docs/05-日志和通知系统.md)** - 日志通知系统
7. **[06-脚本项目结构和配置](./jshelp/docs/06-脚本项目结构和配置.md)** - 项目管理
8. **[07-JS脚本模块导入方式选择指南](./jshelp/docs/07-JS脚本模块导入方式选择指南.md)** - 模块化开发
9. **[08-JS脚本引擎架构与实现原理](./jshelp/docs/08-JS脚本引擎架构与实现原理.md)** - 引擎原理
10. **[09-不可使用的JS方法和功能限制](./jshelp/docs/09-不可使用的JS方法和功能限制.md)** - 功能限制

### 示例项目
- **jshelp/jscode/OCR测试脚本/** - OCR识别功能测试
- **jshelp/jscode/界面初始化测试项目/** - 游戏界面自动化测试

### 源码位置
- **JavaScript引擎**: `BetterGenshinImpact\Core\Script\`
- **全局方法**: `BetterGenshinImpact\Core\Script\Dependence\GlobalMethod.cs`
- **原神API**: `BetterGenshinImpact\Core\Script\Dependence\Genshin.cs`
- **OCR系统**: `BetterGenshinImpact\Core\Recognition\OCR\`
- **自动化功能**: `BetterGenshinImpact\GameTask\Auto*\`

---

## 🤝 社区和支持

### 获取帮助
- **问题反馈**: 通过GitHub Issues报告问题
- **功能建议**: 提交功能改进建议  
- **技术交流**: 参与社区讨论
- **贡献代码**: 欢迎提交Pull Request

### 开发贡献
- **代码规范**: 遵循项目代码风格
- **文档更新**: 及时更新相关文档
- **测试验证**: 提供充分的测试用例
- **向后兼容**: 保持API向后兼容性

---

## ⚠️ 免责声明

本文档和相关脚本仅供学习和研究使用。使用脚本功能时请遵守游戏服务条款，合理使用自动化功能，避免对游戏体验造成负面影响。开发者需要自行承担使用风险。

---

## 📋 版本信息

- **文档版本**: v1.0.0
- **最后更新**: 2025年8月4日
- **适用BGI版本**: >=0.47.0
- **JavaScript引擎**: Microsoft ClearScript V8

---

*本文档将持续更新，欢迎提供反馈和建议！*