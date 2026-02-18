# JavaScript脚本开发 - settings.json配置文件兼容性指南

## 概述

本文档记录了BGI JavaScript脚本开发中settings.json配置文件的兼容性问题和解决方案。

**相关代码位置**：
- **配置解析器**：`BetterGenshinImpact\Model\SettingItem.cs:105`
- **脚本项目加载**：`BetterGenshinImpact\Core\Script\Project\ScriptProject.cs:54`

---

## 已确认的兼容性问题

### 1. JSON格式必须是数组

**错误格式** ❌：
```json
{
  "config": {
    "detectInterval": {
      "type": "input-text",
      "name": "检测间隔"
    }
  }
}
```

**正确格式** ✅：
```json
[
  {
    "name": "detectInterval",
    "type": "input-text",
    "label": "检测间隔(毫秒)",
    "default": "1000"
  }
]
```

### 2. 不支持input-number类型

**错误配置** ❌：
```json
{
    "name": "moveInterval",
    "type": "input-number",
    "default": 2
}
```

**正确配置** ✅：
```json
{
    "name": "moveInterval",
    "type": "input-text",
    "label": "移动间隔(秒) 推荐: 1-10",
    "default": "2"
}
```

### 3. 不支持复杂的select类型

**错误配置** ❌：
```json
{
    "name": "strategy",
    "type": "select",
    "options": [
        { "label": "随机移动", "value": "random" }
    ]
}
```

**正确配置** ✅：
```json
{
    "name": "strategy",
    "type": "input-text",
    "label": "移动策略 (random/circle/forward_back)",
    "default": "random"
}
```

---

## 支持的配置类型

### 1. checkbox - 复选框 ✅

```json
{
    "name": "enableFeature",
    "type": "checkbox",
    "label": "启用功能",
    "default": false
}
```

**JavaScript使用**：
```javascript
const enabled = setting.enableFeature || false;
```

### 2. input-text - 文本输入 ✅

```json
{
    "name": "textValue",
    "type": "input-text",
    "label": "文本值",
    "default": "默认文本"
}
```

**JavaScript使用**：
```javascript
const text = setting.textValue || "默认文本";
```

---

## 数值配置的处理方法

### settings.json配置
```json
{
    "name": "interval",
    "type": "input-text",
    "label": "间隔时间(秒) 推荐: 1-10",
    "default": "2"
}
```

### JavaScript处理

```javascript
// 安全的数值转换函数
function safeParseInt(value, defaultValue, min, max) {
    var parsed = parseInt(value);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
}

// 使用
var interval = safeParseInt(setting.interval, 2, 1, 10) * 1000;
```

---

## 选择器配置的处理方法

### settings.json配置
```json
{
    "name": "strategy",
    "type": "input-text",
    "label": "策略选择 (random/circle/forward_back)",
    "default": "random"
}
```

### JavaScript验证

```javascript
var validStrategies = ["random", "circle", "forward_back"];
var strategy = validStrategies.includes(setting.strategy)
    ? setting.strategy
    : "random";
```

---

## 完整配置示例

### settings.json

```json
[
    {
        "name": "enableFeature",
        "type": "checkbox",
        "label": "启用功能",
        "default": false
    },
    {
        "name": "strategy",
        "type": "input-text",
        "label": "策略选择 (random/circle/forward_back)",
        "default": "random"
    },
    {
        "name": "interval",
        "type": "input-text",
        "label": "间隔时间(秒) 推荐: 1-10",
        "default": "2"
    },
    {
        "name": "threshold",
        "type": "input-text",
        "label": "阈值(%) 范围: 0-100",
        "default": "50"
    }
]
```

### main.js

```javascript
// 安全的配置读取
function safeParseInt(value, defaultValue, min, max) {
    var parsed = parseInt(value);
    if (isNaN(parsed)) return defaultValue;
    return Math.max(min, Math.min(max, parsed));
}

var validStrategies = ["random", "circle", "forward_back"];

var config = {
    enableFeature: setting.enableFeature || false,
    strategy: validStrategies.includes(setting.strategy) ? setting.strategy : "random",
    interval: safeParseInt(setting.interval, 2, 1, 10) * 1000,
    threshold: safeParseInt(setting.threshold, 50, 0, 100)
};

log.info("配置加载成功");
log.info("功能启用: " + config.enableFeature);
log.info("选择策略: " + config.strategy);
log.info("间隔时间: " + (config.interval / 1000) + "秒");
log.info("阈值设置: " + config.threshold + "%");
```

---

## 最佳实践

### ✅ 推荐做法
- 使用数组格式 `[{...}]`
- 只使用 `checkbox` 和 `input-text` 类型
- 在 label 中说明有效值和范围
- 数值配置使用字符串默认值，在JS中转换
- 为用户提供清晰的推荐值

### ❌ 避免的做法
- 使用对象格式 `{"config": {...}}`
- 使用 `input-number` 或 `select` 类型
- 数值类型的默认值（使用字符串）
- 复杂的嵌套结构

---

## 版本兼容性记录

### BGI v0.51.0.0 测试结果

| 配置类型/格式 | 支持状态 | 备注 |
|-------------|---------|------|
| 数组格式 `[{...}]` | ✅ 支持 | 必须使用 |
| 对象格式 `{"config": {...}}` | ❌ 不支持 | JSON反序列化错误 |
| checkbox | ✅ 支持 | 完全可用 |
| input-text | ✅ 支持 | 完全可用 |
| input-number | ❌ 不支持 | Unknown setting type错误 |
| select | ❌ 不支持 | JSON解析错误 |

---

## 版本信息

- **文档版本**: v3.0.0
- **最后更新**: 2026年1月20日
- **适用BGI版本**: >=0.51.0
- **维护状态**: 活跃维护

## 变更记录

- v3.0.0 (2026-01-20):
  - 🔥 **大幅简化**: 删除冗长的示例库（从1323行精简至300+行）
  - ✅ **保留核心**: 保留所有兼容性问题说明和解决方案
  - 📝 **优化结构**: 重点突出，更易阅读
- v2.0.0 (2026-01-18): 新增8个完整配置示例和3个配置模板
- v1.0.0 (2025-09-28): 初始版本，记录兼容性问题

