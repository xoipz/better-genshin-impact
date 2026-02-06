# BGI JavaScript脚本开发文档总览

## 欢迎使用BGI JavaScript脚本开发文档

本文档集为BGI（BetterGenshinImpact）项目的JavaScript脚本开发提供全面的技术指导。无论您是初学者还是经验丰富的开发者，都能在这里找到所需的技术信息。

---

## 🎯 实战项目案例

### [AutoCommission 模块化重构项目](./jscode/AutoCommission/README_REFACTOR.md)
**BGI JavaScript脚本模块化开发的标杆项目**

这是一个将3067行单体main.js文件成功重构为9个功能模块的完整案例，展示了BGI环境下JavaScript脚本模块化开发的最佳实践。

**项目亮点**：
- 🏗️ **模块化架构**: 从单体文件拆分为9个功能明确的模块
- 🔬 **技术突破**: 发现并解决BGI ClearScript V8引擎的作用域问题
- 📋 **开发指南**: 提供完整的BGI脚本模块化开发标准
- 🛠️ **实用工具**: 包含调试验证、问题排查等实用方法

**核心技术发现**：
```javascript
// ✅ 正确的模块声明方式 (使用var)
var ModuleName = {
  method1: function() { /* ... */ },
  method2: async function() { /* ... */ }
};

// ❌ 错误的模块声明方式 (const在BGI环境中无法跨作用域)
const ModuleName = { /* ... */ };
```

**重构成果**：
- **代码结构**: 从3067行 → 9个模块 + 158行主文件
- **维护性**: 功能模块清晰分离，独立开发测试
- **扩展性**: 支持灵活的功能扩展和模块替换
- **稳定性**: 通过严格的模块加载验证确保运行稳定

**适用场景**：
- 大型JavaScript脚本的模块化重构
- BGI环境下的企业级脚本开发
- 复杂自动化功能的架构设计
- JavaScript脚本的团队协作开发

---

## 📚 文档目录

### [00-完整代码位置索引](./00-完整代码位置索引.md)
提供项目中所有JavaScript相关代码文件的完整路径索引，包含具体的行号范围，便于快速定位和参考源码实现。

**包含内容**：
- JavaScript引擎核心文件位置
- API依赖注入代码位置  
- 识别和OCR系统代码位置
- Auto系列自动化功能代码位置
- 配置系统和服务层代码位置

---

### [01-全局方法API](./01-全局方法API.md)
详细介绍BGI暴露给JavaScript的全局方法API，这些是脚本开发的基础构建块。

**核心功能**：
- ✅ **延时控制**: `sleep()` - 脚本暂停执行
- ⌨️ **键盘操作**: `keyDown()`, `keyUp()`, `keyPress()` - 模拟键盘输入
- 🖱️ **鼠标操作**: `click()`, `moveMouseTo()`, 各种鼠标按钮操作
- 🎮 **游戏设置**: `setGameMetrics()` - 设置游戏分辨率和DPI
- 📸 **识图功能**: `captureGameRegion()` - 截取游戏画面
- 📝 **文本输入**: `inputText()` - 向游戏输入文本内容

**代码位置**: `BetterGenshinImpact\Core\Script\Dependence\GlobalMethod.cs:20-295`

---

### [02-原神游戏API](./02-原神游戏API.md)
专门针对原神游戏优化的高级API接口，提供游戏特定的自动化功能。

**主要功能**：
- 🌍 **传送系统**: `genshin.tp()` - 传送到指定坐标
- 🗺️ **地图操作**: 大地图移动、缩放、位置获取
- 👥 **队伍管理**: `genshin.switchParty()` - 切换队伍配置
- 🎣 **自动钓鱼**: `genshin.autoFishing()` - 自动化钓鱼功能
- 🏆 **奖励领取**: 自动领取各种游戏奖励
- 🧭 **位置导航**: 前往特定游戏地点
- 💬 **UI交互**: 对话选择、界面导航

**代码位置**: `BetterGenshinImpact\Core\Script\Dependence\Genshin.cs:22-345`

---

### [03-OCR识别](./03-OCR识别.md)
基于PaddleOCR的强大文字识别功能，支持中英文混合识别。

**核心特性**：
- 🔍 **文字识别**: 支持游戏内文字的准确识别
- 📊 **置信度评分**: 提供识别结果的可靠性评估
- 📍 **位置信息**: 精确的文字位置坐标
- 🎯 **智能点击**: 根据识别结果自动点击UI元素
- 🔢 **数值提取**: 自动提取游戏内的数字信息

**数据结构**:
- `OcrResult` - 完整识别结果
- `OcrResultRegion` - 单个识别区域
- `OcrRecognizerResult` - 识别器结果

**代码位置**: `BetterGenshinImpact\Core\Recognition\OCR\OcrResult.cs:4-68`

---

### [04-Auto自动化](./04-Auto自动化.md)
BGI提供的各种自动化功能模块，覆盖游戏的方方面面。

**自动化模块**：
- ⚔️ **AutoFight**: 自动战斗系统
- 🎣 **AutoFishing**: 自动钓鱼系统  
- 🍳 **AutoCook**: 自动烹饪功能
- 🏰 **AutoDomain**: 自动秘境挑战
- 🎵 **AutoMusicGame**: 自动音游演奏
- 🗺️ **AutoPathing**: 自动路径导航
- 🌸 **AutoPick**: 自动采集系统
- ⏭️ **AutoSkip**: 自动跳过对话
- 🌳 **AutoWood**: 自动砍树功能

**组合使用**: 支持多个自动化功能的组合使用，实现复杂的自动化流程

**代码位置**: `BetterGenshinImpact\GameTask\Auto*\` 目录下的各个模块

---

### [05-日志和通知系统](./05-日志和通知系统.md)
完整的日志记录和通知推送系统，帮助调试脚本和接收运行状态。

**日志系统**：
- 📝 **多级别日志**: Debug, Info, Warn, Error
- 🔍 **调试支持**: 详细的运行时信息记录
- 📊 **状态跟踪**: 脚本执行状态的实时记录

**通知系统**：
- ✅ **成功通知**: `notification.success()` - 任务完成通知
- ❌ **错误通知**: `notification.error()` - 错误情况提醒  
- ℹ️ **信息通知**: `notification.info()` - 一般信息推送
- 🛡️ **安全机制**: 内置频率限制和安全验证

**文件系统**：
- 📁 **安全文件访问**: `limitedFile.readAllText()` - 受限的文件读取

**代码位置**: 
- 日志: `BetterGenshinImpact\Core\Script\Dependence\Log.cs:8-45`
- 通知: `BetterGenshinImpact\Core\Script\Dependence\Notification.cs:10-80`

---

### [06-脚本项目结构和配置](./06-脚本项目结构和配置.md)
BGI脚本的项目化管理体系，包括项目结构、配置管理、依赖处理等。

**项目结构**：
- 📋 **manifest.json**: 项目清单文件，定义脚本基本信息
- 🏗️ **标准目录结构**: main.js, config/, lib/, assets/ 等
- 👤 **作者信息**: 完整的作者信息管理
- 🏷️ **标签分类**: 脚本的分类和标签系统

**脚本组管理**：
- 📦 **脚本组**: 多个脚本的组合管理
- ⚡ **执行策略**: 顺序执行或并行执行
- 🔧 **错误处理**: 继续执行或停止策略

**配置系统**：
- ⚙️ **多层配置**: 默认配置 + 用户自定义配置
- ✅ **配置验证**: JSON Schema验证支持
- 🔄 **动态加载**: 运行时配置更新

**生命周期管理**：
- 🚀 **启动钩子**: `onStart()` - 脚本启动时执行
- 🛑 **停止钩子**: `onStop()` - 脚本停止时执行  
- ⏸️ **暂停/恢复**: `onPause()`, `onResume()` 状态管理

**代码位置**:
- 项目管理: `BetterGenshinImpact\Core\Script\Project\ScriptProject.cs:15-200`
- 脚本组: `BetterGenshinImpact\Core\Script\Group\ScriptGroup.cs:12-100`

---

### [07-JS脚本模块导入方式选择指南](./07-JS脚本模块导入方式选择指南.md)
详细分析BGI JavaScript脚本环境中两种模块导入方式的优缺点和选择建议。

**两种导入方式**：
- 🔧 **eval() + file.readTextSync()**: BGI原生稳定支持的导入方式
- ⚠️ **CommonJS require()**: 理论支持但存在兼容性问题

**技术对比**：
- 📊 **兼容性对比**: eval方式vs CommonJS方式的详细对比表
- 🛡️ **稳定性分析**: 不同BGI版本的支持情况
- 💡 **最佳实践**: 推荐的模块设计和导出模式

**实际建议**：
- ✅ **生产环境**: 推荐使用eval()方式确保兼容性
- 🔬 **实验项目**: 可尝试CommonJS但需承担兼容风险

---

### [08-JS脚本引擎架构与实现原理](./08-JS脚本引擎架构与实现原理.md)
深入解析BGI JavaScript脚本引擎的技术架构和实现原理。

**引擎核心**：
- 🔧 **Microsoft ClearScript V8**: 基于V8引擎的.NET JavaScript运行时
- 🏗️ **引擎配置**: V8ScriptEngineFlags和TaskPromiseConversion设置
- 🔄 **异步支持**: Task与Promise的自动转换机制

**安全架构**：
- 🛡️ **沙箱隔离**: 严格的文件系统访问限制
- 🔐 **权限控制**: manifest.json权限声明系统
- 🚫 **风险防控**: ExtendedHostFunctions等危险功能的禁用

**模块系统**：
- 📦 **CommonJS支持**: DocumentSettings配置和搜索路径
- 📁 **文件访问**: LimitedFile类的安全文件操作
- 🔍 **路径验证**: 防路径遍历的安全机制

---

### [09-不可使用的JS方法和功能限制](./09-不可使用的JS方法和功能限制.md)
详细列出在BGI JavaScript脚本环境中不可使用或受限制的标准JavaScript功能。

**网络功能限制**：
- ❌ **Web API**: fetch(), XMLHttpRequest, WebSocket 等完全不可用
- 🚫 **HTTP模块**: Node.js网络模块不存在

**DOM/BOM限制**：  
- ❌ **DOM操作**: document, element等浏览器API不存在
- 🚫 **浏览器对象**: window, location, history等不可用
- ❌ **存储API**: localStorage, sessionStorage不支持

**模块系统限制**：
- ⚠️ **ES6 modules**: import/export语法不稳定支持
- ❓ **CommonJS**: require()可能出现"not defined"错误

**文件系统限制**：
- 🔒 **扩展名白名单**: 仅支持.txt, .json, .log, .csv, .xml, .html, .css
- 📏 **文件大小限制**: 最大999MB
- 🛡️ **路径限制**: 仅可访问项目目录内文件

**替代方案**：
- ✅ **BGI全局对象**: log, notification, file, genshin等专用API
- 🔧 **安全导入**: eval(file.readTextSync())模式

**代码位置**:
- 安全机制: `BetterGenshinImpact\Core\Script\Dependence\LimitedFile.cs`
- 路径验证: `BetterGenshinImpact\Core\Script\Utils\ScriptUtils.cs:11-25`

---

## 🚀 快速开始

### 1. 环境准备
确保您已经安装并配置好BGI环境：
- BGI主程序正常运行
- JavaScript脚本功能已启用
- 游戏分辨率设置为16:9比例

### 2. 第一个脚本
```javascript
// 设置游戏分辨率
setGameMetrics(1920, 1080);

// 输出当前位置
const position = genshin.getPositionFromMap();
log.info(`当前位置: (${position.X}, ${position.Y})`);

// 发送通知
notification.success('脚本测试', '第一个脚本运行成功！');
```

### 3. 学习路径建议
1. **基础API学习**: 从全局方法API开始，掌握基本的键鼠操作
2. **游戏API探索**: 学习原神专用API，了解游戏特定功能
3. **识别功能实践**: 掌握OCR识别，实现智能UI交互
4. **自动化功能组合**: 学习Auto系列功能的组合使用
5. **项目化开发**: 构建完整的脚本项目，包含配置和错误处理

---

## 🛠️ 开发工具推荐

- **代码编辑器**: VS Code, WebStorm 等
- **调试工具**: BGI内置的日志系统和通知系统
- **版本控制**: Git (推荐使用GitHub管理脚本项目)
- **文档工具**: Markdown编辑器用于编写项目说明

---

## 📋 开发最佳实践

### 错误处理
```javascript
try {
    await riskyOperation();
} catch (error) {
    log.error('操作失败:', error.message);
    notification.error('错误提示', error.message);
}
```

### 配置管理
```javascript
const config = new ConfigManager('./');
const timeout = config.get('general.timeout', 5000);
```

### 日志记录
```javascript
log.info('开始执行任务');
log.debug('详细调试信息');
log.warn('注意事项');
log.error('错误信息');
```

---

## 🤝 社区和支持

- **问题反馈**: 通过GitHub Issues报告问题
- **功能建议**: 提交功能改进建议
- **技术交流**: 参与社区讨论
- **贡献代码**: 欢迎提交Pull Request

---

## 📖 相关资源

- **BGI主项目**: BetterGenshinImpact主仓库
- **脚本示例**: 官方提供的脚本示例集合
- **API文档**: 详细的API参考文档
- **更新日志**: 功能更新和修复记录

---

## ⚠️ 免责声明

本文档仅供学习和研究使用。使用脚本功能时请遵守游戏服务条款，合理使用自动化功能，避免对游戏体验造成负面影响。开发者需要自行承担使用风险。

---

*最后更新: 2025年1月*  
*文档版本: v1.0.0*