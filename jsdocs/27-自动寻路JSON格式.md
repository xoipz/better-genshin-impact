# JavaScript脚本开发 - 自动寻路JSON格式

## 概述

**自动寻路 (AutoPathing)** 是BGI的核心功能之一。脚本中可以通过 `pathingScript.run(jsonString)` 或 `pathingScript.runFile(filePath)` 来执行路径任务。这些任务通常以JSON格式存储。

虽然大多数路径文件由BGI的地图编辑器自动生成，但了解其数据结构对于手动调整或在脚本中动态生成路径非常有用。

**相关代码位置**:
- 数据模型: `BetterGenshinImpact\GameTask\AutoPathing\Model\` 目录
- `PathingTask.cs`: 根对象
- `PathingTaskInfo.cs`: 任务元数据
- `Waypoint.cs`: 路径点定义

---

## 完整JSON结构

```json
{
  "Info": {
    "Name": "任务名称",
    "Description": "任务描述",
    "Author": "作者名",
    "Version": "1.0",
    "BgiVersion": "0.60.0",
    "Type": "Pathing",
    "Order": 0,
    "Tags": ["标签1", "标签2"],
    "EnableMonsterLootSplit": false,
    "MapName": "Teyvat",
    "MapMatchMethod": "TemplateMatch",
    "Items": [] 
  },
  "Config": {
    "RealtimeTriggers": {
      "AutoPick": true
    }
  },
  "FarmingInfo": {
    "allow_farming_count": false,
    "normal_mob_count": 0,
    "elite_mob_count": 0,
    "primary_target": "",
    "duration_seconds": 0,
    "elite_details": "",
    "total_mora": 0
  },
  "Positions": [
    {
      "X": 1234.5,
      "Y": 5678.9,
      "Type": "Path",
      "MoveMode": "Walk",
      "Action": null,
      "ActionParams": null,
      "PointExtParams": {
        "Description": "",
        "MonsterTag": "normal",
        "EnableMonsterLootSplit": false,
        "Misidentification": {
          "Type": ["unrecognized"],
          "HandlingMode": "previousDetectedPoint",
          "ArrivalTime": 0
        }
      }
    }
    // ... 更多路径点
  ]
}
```

---

## 字段详解

### 1. Info (任务基本信息)

定义任务的元数据，如名称、作者、版本等。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `Name` | string | 任务名称，显示在调度器中 |
| `Description` | string | 任务描述 |
| `Author` | string | 作者信息 |
| `Version` | string | 任务版本号 |
| `BgiVersion` | string | 依赖的最低BGI版本，用于兼容性检查 |
| `Type` | string | 任务类型 (通常为 "Pathing") |
| `Order` | number | 排序权重，同目录下按此排序 |
| `Tags` | string[] | 展示用的标签 |
| `EnableMonsterLootSplit` | boolean | 是否开启怪物拾取区分 |
| `MapName` | string | 地图名称 (默认 "Teyvat") |
| `MapMatchMethod` | string | 地图匹配方式 ("SIFT" 或 "TemplateMatch") |

### 2. Config (任务运行配置)

定义任务运行时的特定行为配置。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `RealtimeTriggers` | object | 实时触发器开关配置 |
| `RealtimeTriggers.AutoPick` | boolean | 是否在路径过程中开启自动拾取 |

### 3. ParsingInfo / FarmingInfo (锄地统计)

用于记录统计数据的字段，通常在生成文件时留空，由程序运行时填充（如果是作为记录结果）。作为任务输入时，主要关注非统计类配置。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `allow_farming_count` | boolean | 是否允许战斗统计 |
| `primary_target` | string | 战斗主目标 ("elite" 或 "normal") |

### 4. Positions (路径点列表)

**核心部分**。定义了角色移动的路径点数组。

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `X` | number | 游戏内地图坐标 X |
| `Y` | number | 游戏内地图坐标 Y |
| `Type` | string | 路径点类型 |
| `MoveMode` | string | 移动模式 |
| `Action` | string | 到达点后执行的动作 |
| `ActionParams` | string | 动作参数 |
| `PointExtParams` | object | 扩展参数 |

#### 路径点类型 (`Type`)

- `Path`: 普通路径点
- `Teleport`: 传送点 (到达该点时会触发传送逻辑)
- `Stop`: 停止点

#### 移动模式 (`MoveMode`)

- `Walk`: 步行/跑步
- `Run`: 冲刺
- `Fly`: 飞行/滑翔
- `Swim`: 游泳
- `Climb`: 攀爬

#### 扩展参数 (`PointExtParams`)

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `Description` | string | 路径点备注 |
| `MonsterTag` | string | 怪物标记 ("normal", "elite", "legendary")，用于战斗统计 |
| `Misidentification.HandlingMode` | string | 异常处理模式 ("previousDetectedPoint", "mapRecognition", "ScheduledArrival") |

#### 常用动作 (`Action`)

到达该点后可以执行特定动作：
- `Fight`: 触发战斗逻辑（通常结合 `MonsterTag`）
- `Pick`: 触发采集逻辑
- `Interact`: 触发交互（如F键）
- `Jump`: 跳跃
- `Skill`: 释放技能

---

## 动态生成示例

在JavaScript中，你可以动态生成这个JSON对象并传入 `pathingScript.run()`。

```javascript
// 简单的向右移动示例
const startPos = genshin.getPositionFromMap();
const myTask = {
    Info: { Name: "Dynamic Task" },
    Positions: []
};

// 生成10个向右移动的点
for(let i=1; i<=10; i++) {
    myTask.Positions.push({
        X: startPos.X + (i * 10), // 每步X+10
        Y: startPos.Y,
        Type: "Path",
        MoveMode: "Walk"
    });
}

// 执行任务
await pathingScript.run(JSON.stringify(myTask));
```

---

## 最佳实践

1. **优先使用编辑器**: 复杂的路径建议使用BGI自带的地图路径编辑器录制或编辑，然后导出JSON。只有在需要动态生成路径或进行简单修改时才手动操作JSON。
2. **坐标准确性**: `X` 和 `Y` 必须是游戏内的小地图/大地图坐标体系。可以使用 `genshin.getPositionFromMap()` 获取当前坐标作为参考。
3. **版本兼容**: 注意 `BgiVersion` 字段，如果你的脚本依赖新版本的路径特性，请设置正确的版本号以提示用户升级。
