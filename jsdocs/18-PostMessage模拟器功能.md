# JavaScript脚本开发 - PostMessage模拟器功能

## 概述

BGI提供了PostMessage模拟器功能，允许JavaScript脚本通过Windows PostMessage API进行后台键盘鼠标操作。这种方式不同于传统的模拟输入，可以在不激活游戏窗口的情况下发送输入消息，适用于后台自动化场景。

**相关代码位置**:
- PostMessage模拟器: `BetterGenshinImpact\Core\Script\Dependence\Simulator\PostMessage.cs:9-44`
- 核心模拟器: `BetterGenshinImpact\Core\Simulator\PostMessageSimulator.cs`
- 类型注入: `BetterGenshinImpact\Core\Script\EngineExtend.cs:45`

---

## PostMessage类型

### 基础概念

`PostMessage`是一个类型（不是对象），需要通过`new`关键字实例化使用。它提供了后台键盘鼠标操作功能，基于Windows PostMessage API实现。

```javascript
// 创建PostMessage实例
const postMsg = new PostMessage();

// 使用实例进行操作
postMsg.keyPress('VK_W');
```

---

## 核心方法

### keyDown(key)
发送按键按下消息到游戏窗口（后台方式）。

```javascript
const postMsg = new PostMessage();

// 按下W键（不释放）
postMsg.keyDown('VK_W');

// 按下空格键
postMsg.keyDown('VK_SPACE');

// 按下Ctrl键
postMsg.keyDown('VK_CONTROL');
```

**参数**:
- `key` (string): 虚拟键码字符串，必须是VirtualKeyCodes枚举中的值

**特点**:
- 后台执行，不需要游戏窗口处于前台
- 按键会保持按下状态直到调用keyUp
- 适用于需要长时间按下某个键的场景

**代码位置**: `PostMessage.cs:13-16`

### keyUp(key)
发送按键释放消息到游戏窗口（后台方式）。

```javascript
const postMsg = new PostMessage();

// 先按下W键
postMsg.keyDown('VK_W');

// 等待一段时间后释放W键
setTimeout(() => {
    postMsg.keyUp('VK_W');
}, 2000);
```

**参数**:
- `key` (string): 虚拟键码字符串

**特点**:
- 必须与keyDown配对使用
- 释放之前按下的键
- 后台执行模式

**代码位置**: `PostMessage.cs:18-21`

### keyPress(key)
发送按键点击消息（按下并立即释放）到游戏窗口。

```javascript
const postMsg = new PostMessage();

// 快速按下并释放空格键
postMsg.keyPress('VK_SPACE');

// 按下回车键
postMsg.keyPress('VK_RETURN');

// 按下ESC键
postMsg.keyPress('Escape');
```

**参数**:
- `key` (string): 虚拟键码字符串

**特点**:
- 自动完成按下和释放动作
- 适用于单次按键操作
- 后台执行，不影响当前窗口焦点

**代码位置**: `PostMessage.cs:23-26`

### click()
发送鼠标左键点击消息到游戏窗口。

```javascript
const postMsg = new PostMessage();

// 在当前鼠标位置进行左键点击
postMsg.click();
```

**特点**:
- 在当前鼠标位置执行点击
- 后台执行模式
- 仅支持左键点击

**代码位置**: `PostMessage.cs:28-31`

---

## 使用示例

### 基础后台操作
```javascript
async function backgroundControls() {
    const postMsg = new PostMessage();
    
    try {
        log.info("开始后台键盘操作");
        
        // 后台按下W键前进
        postMsg.keyDown('VK_W');
        await sleep(3000); // 前进3秒
        postMsg.keyUp('VK_W');
        
        // 后台跳跃
        postMsg.keyPress('VK_SPACE');
        await sleep(500);
        
        // 后台点击
        postMsg.click();
        
        log.info("后台操作完成");
        
    } catch (error) {
        log.error("后台操作失败:", error.message);
    }
}
```

### 组合键操作
```javascript
async function backgroundComboKeys() {
    const postMsg = new PostMessage();
    
    try {
        // 组合键：Ctrl + C
        postMsg.keyDown('VK_CONTROL');
        await sleep(100);
        postMsg.keyPress('VK_C');
        await sleep(100);
        postMsg.keyUp('VK_CONTROL');
        
        await sleep(500);
        
        // 组合键：Ctrl + V
        postMsg.keyDown('VK_CONTROL');
        await sleep(100);
        postMsg.keyPress('VK_V');
        await sleep(100);
        postMsg.keyUp('VK_CONTROL');
        
        log.info("组合键操作完成");
        
    } catch (error) {
        log.error("组合键操作失败:", error.message);
    }
}
```

### 自动战斗序列
```javascript
async function backgroundCombatSequence() {
    const postMsg = new PostMessage();
    
    const combatActions = [
        'VK_Q',      // 大招
        'VK_E',      // 元素技能
        'VK_SPACE',  // 普攻/闪避
        'VK_R'       // 特殊技能
    ];
    
    try {
        log.info("开始后台战斗序列");
        
        for (const action of combatActions) {
            postMsg.keyPress(action);
            await sleep(800); // 技能间隔
            
            // 在技能间隔期间进行点击攻击
            for (let i = 0; i < 3; i++) {
                postMsg.click();
                await sleep(200);
            }
        }
        
        log.info("战斗序列完成");
        
    } catch (error) {
        log.error("战斗序列失败:", error.message);
    }
}
```

### 后台移动控制
```javascript
async function backgroundMovement() {
    const postMsg = new PostMessage();
    
    const movements = [
        { key: 'VK_W', duration: 2000, direction: '前进' },
        { key: 'VK_D', duration: 1000, direction: '右转' },
        { key: 'VK_S', duration: 1500, direction: '后退' },
        { key: 'VK_A', duration: 1000, direction: '左转' }
    ];
    
    try {
        log.info("开始后台移动控制");
        
        for (const movement of movements) {
            log.debug(`${movement.direction} ${movement.duration}ms`);
            
            postMsg.keyDown(movement.key);
            await sleep(movement.duration);
            postMsg.keyUp(movement.key);
            
            // 移动间隔
            await sleep(300);
        }
        
        log.info("移动控制完成");
        
    } catch (error) {
        log.error("移动控制失败:", error.message);
    }
}
```

---

## 与其他功能的对比

### PostMessage vs 全局方法

| 功能 | PostMessage | 全局方法 (keyPress等) |
|------|-------------|---------------------|
| 执行方式 | 后台消息发送 | 前台模拟输入 |
| 窗口焦点要求 | 不需要 | 需要游戏窗口激活 |
| 检测风险 | 较低 | 较高 |
| 响应速度 | 快速 | 中等 |
| 兼容性 | 依赖PostMessage支持 | 通用 |

```javascript
// PostMessage方式（后台）
const postMsg = new PostMessage();
postMsg.keyPress('VK_W'); // 后台发送消息

// 全局方法方式（前台）
keyPress('VK_W'); // 前台模拟输入
```

### 使用场景选择

**推荐使用PostMessage的场景**:
- 需要后台运行的自动化脚本
- 多窗口环境下的操作
- 需要避免干扰用户其他操作
- 对检测敏感度要求较高的场景

**推荐使用全局方法的场景**:
- 需要精确控制输入时机
- 对输入响应有严格要求
- 兼容性要求较高的场景

---

## 错误处理和最佳实践

### 1. 键码验证
```javascript
function safePostMessageKey(key) {
    const postMsg = new PostMessage();
    
    try {
        postMsg.keyPress(key);
        return true;
    } catch (error) {
        log.error(`无效的键码: ${key}, 错误: ${error.message}`);
        return false;
    }
}

// 使用示例
const validKeys = ['VK_W', 'VK_A', 'VK_S', 'VK_D'];
for (const key of validKeys) {
    if (safePostMessageKey(key)) {
        log.info(`键码 ${key} 有效`);
    }
}
```

### 2. 按键状态管理
```javascript
class PostMessageController {
    constructor() {
        this.postMsg = new PostMessage();
        this.pressedKeys = new Set();
    }
    
    keyDown(key) {
        if (!this.pressedKeys.has(key)) {
            this.postMsg.keyDown(key);
            this.pressedKeys.add(key);
            log.debug(`按下键: ${key}`);
        }
    }
    
    keyUp(key) {
        if (this.pressedKeys.has(key)) {
            this.postMsg.keyUp(key);
            this.pressedKeys.delete(key);
            log.debug(`释放键: ${key}`);
        }
    }
    
    releaseAllKeys() {
        for (const key of this.pressedKeys) {
            this.postMsg.keyUp(key);
        }
        this.pressedKeys.clear();
        log.info("释放所有按键");
    }
}

// 使用示例
const controller = new PostMessageController();

// 确保脚本结束时释放所有按键
process.on('exit', () => {
    controller.releaseAllKeys();
});
```

### 3. 定时操作管理
```javascript
async function timedPostMessageActions() {
    const postMsg = new PostMessage();
    
    // 定时按键序列
    const timedActions = [
        { action: () => postMsg.keyPress('VK_1'), delay: 0 },
        { action: () => postMsg.keyPress('VK_2'), delay: 1000 },
        { action: () => postMsg.keyPress('VK_3'), delay: 2000 },
        { action: () => postMsg.click(), delay: 3000 }
    ];
    
    try {
        for (const {action, delay} of timedActions) {
            if (delay > 0) {
                await sleep(delay);
            }
            action();
            log.debug(`执行定时操作，延时: ${delay}ms`);
        }
    } catch (error) {
        log.error("定时操作失败:", error.message);
    }
}
```

---

## 注意事项

### ⚠️ 重要提醒

1. **实例化使用**: PostMessage是类型，需要通过`new PostMessage()`创建实例
2. **键码格式**: 必须使用有效的VirtualKeyCodes枚举值（如'VK_W'，不是'w'）
3. **按键配对**: keyDown和keyUp必须配对使用，避免按键卡死
4. **后台特性**: 不需要游戏窗口激活，但仍需要游戏进程运行

### ❌ 常见错误

```javascript
// ❌ 错误：直接使用PostMessage类型
PostMessage.keyPress('VK_W'); // 会报错，PostMessage不是对象

// ❌ 错误：使用无效的键码
const postMsg = new PostMessage();
postMsg.keyPress('w'); // 应该使用'VK_W'

// ❌ 错误：按键不配对
postMsg.keyDown('VK_W');
// 忘记调用keyUp，导致按键卡死
```

### ✅ 正确用法

```javascript
// ✅ 正确：创建实例使用
const postMsg = new PostMessage();
postMsg.keyPress('VK_W');

// ✅ 正确：按键配对
postMsg.keyDown('VK_W');
await sleep(1000);
postMsg.keyUp('VK_W');

// ✅ 正确：错误处理
try {
    postMsg.keyPress('VK_INVALID');
} catch (error) {
    log.error("无效键码:", error.message);
}
```

---

## 相关文档

- **[01-全局方法API](./01-全局方法API.md)** - 传统键鼠操作方法对比
- **[13-键鼠脚本和宏录制功能](./13-键鼠脚本和宏录制功能.md)** - 宏录制功能
- **[12-任务调度器和定时器功能](./12-任务调度器和定时器功能.md)** - 定时任务集成
- **[05-日志和通知系统](./05-日志和通知系统.md)** - 日志记录功能

---

## 版本信息

- **文档版本**: v1.1.0
- **最后更新**: 2026年1月18日
- **适用BGI版本**: >=0.52.0
- **维护状态**: 活跃维护

## 变更记录

- v1.1.0 (2026-01-18): 更新文档日期