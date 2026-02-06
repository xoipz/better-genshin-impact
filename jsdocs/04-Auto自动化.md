# JavaScript脚本开发 - Auto系列自动化功能

## 概述

BGI提供了丰富的Auto系列自动化功能，涵盖战斗、钓鱼、烹饪、音游、路径导航等各个方面。这些功能可以直接在JavaScript中调用，实现复杂的自动化任务。

**相关代码位置**: `BetterGenshinImpact\GameTask\Auto*\` 目录下的各个模块

---

## 自动战斗 (AutoFight)

### 相关文件
- **核心**: `AutoFightTask.cs:29-400`
- **配置**: `AutoFightConfig.cs:15-180`
- **上下文**: `AutoFightContext.cs:12-60`

### 基础使用

```javascript
// 通过原神API调用（推荐方式）
const avatars = getAvatars(); // 获取当前队伍角色
log.info('当前队伍:', avatars);

// 启动一键战斗（需要预先配置战斗策略）
// 注意：AutoFight功能主要通过C#内部调用，JS中主要用于获取角色信息
```

### 角色信息获取 - getAvatars()

**BGI提供的核心API**：
```javascript
// 获取当前可见的队伍角色
const avatars = getAvatars();
log.info('当前队伍:', avatars);

// 返回值：字符串数组，包含当前队伍角色名称
// 例如: ["胡桃", "夜兰", "钟离", "万叶"]
```

**API详细说明**：
- **功能**: 实时获取当前队伍中的角色信息
- **返回类型**: `string[]` - 角色名称的字符串数组  
- **检测范围**: 当前屏幕上可见的角色头像
- **角色名称**: 游戏内的中文角色名称
- **更新频率**: 实时获取，反映当前队伍状态

**实用示例**：
```javascript
async function checkTeamComposition() {
    // 获取当前可见角色
    const avatars = getAvatars();
    
    if (avatars.length === 0) {
        log.warn('未检测到角色，可能不在战斗界面');
        return false;
    }
    
    log.info('检测到角色:');
    avatars.forEach((avatar, index) => {
        log.info(`${index + 1}. ${avatar}`);
    });
    
    // 检查是否有特定角色类型
    const hasHealer = avatars.some(name => 
        ['芭芭拉', '琴', '七七', '迪奥娜', '班尼特', '珊瑚宫心海', '白术'].includes(name)
    );
    const hasShielder = avatars.some(name => 
        ['钟离', '迪奥娜', '托马', '莱依拉'].includes(name)
    );
    
    log.info('队伍中有治疗角色:', hasHealer);
    log.info('队伍中有护盾角色:', hasShielder);
    
    return true;
}
```

---

## 自动钓鱼 (AutoFishing)

### 相关文件
- **主任务**: `AutoFishingTask.cs:25-200`
- **配置**: `AutoFishingConfig.cs:10-50`
- **图像识别**: `AutoFishingImageRecognition.cs:20-150`

### 基础钓鱼功能

```javascript
async function startAutoFishing() {
    try {
        // 使用原神API进行自动钓鱼
        log.info('开始自动钓鱼...');
        
        // fishingTimePolicy参数:
        // 0: 默认策略
        // 1: 快速拉杆
        // 2: 完美时机
        await genshin.autoFishing(1);
        
        log.info('自动钓鱼完成');
    } catch (error) {
        log.error('钓鱼过程出现错误:', error.message);
    }
}
```

### 钓鱼点巡回

```javascript
async function fishingRoute() {
    const fishingSpots = [
        { name: '蒙德城钓鱼点', x: 1200, y: 800 },
        { name: '达达乌帕谷', x: 1500, y: 1200 },
        { name: '石门', x: 1800, y: 1000 }
    ];
    
    for (const spot of fishingSpots) {
        log.info(`前往: ${spot.name}`);
        
        // 传送到钓鱼点
        await genshin.tp(spot.x, spot.y);
        await sleep(3000); // 等待传送完成
        
        // 开始钓鱼
        try {
            await genshin.autoFishing(1);
            log.info(`${spot.name} 钓鱼完成`);
        } catch (error) {
            log.error(`${spot.name} 钓鱼失败:`, error.message);
        }
        
        await sleep(2000);
    }
}
```

---

## 自动烹饪 (AutoCook)

### 相关文件
- **配置**: `AutoCookConfig.cs:8-30`
- **触发器**: `AutoCookTrigger.cs:15-80`

### 批量烹饪

```javascript
async function autoCookRoutine() {
    // 前往烹饪点
    await genshin.tp(1450, 1700); // 蒙德城烹饪点
    await sleep(2000);
    
    // 与烹饪锅交互
    keyPress('VK_F');
    await sleep(1500);
    
    // 选择要烹饪的食物并批量制作
    // 这里需要根据UI进行相应的按键操作
    await selectCookingItem('蒙德土豆饼');
    await setCookingAmount(10);
    await startCooking();
}

async function selectCookingItem(itemName) {
    // 使用OCR识别菜谱名称
    const gameImage = captureGameRegion();
    const ocrResult = gameImage.ocr();
    
    const targetItem = ocrResult.Regions.find(region => 
        region.Text.includes(itemName) && region.Score > 0.8
    );
    
    if (targetItem) {
        click(targetItem.Rect.Center.X, targetItem.Rect.Center.Y);
        await sleep(500);
        return true;
    }
    
    return false;
}
```

---

## 自动音游 (AutoMusicGame)

### 相关文件
- **主任务**: `AutoMusicGameTask.cs:20-150`
- **配置**: `AutoMusicGameConfig.cs:12-40`
- **音乐专辑**: `AutoAlbumTask.cs:15-100`

### 音游自动化

```javascript
async function playMusicGame() {
    log.info('准备开始音游自动化');
    
    // 进入音游界面的操作
    await navigateToMusicGame();
    
    // 选择歌曲
    await selectSong('风花节的歌');
    
    // 开始自动演奏（这个功能需要内置的音游识别系统）
    // 注意：实际的音游自动化主要由C#端处理
    log.info('音游自动化已启动，请等待完成');
}

async function navigateToMusicGame() {
    // 打开背包
    keyPress('VK_B');
    await sleep(1000);
    
    // 导航到小道具标签页
    // 这里需要根据实际UI进行操作
    await clickUIText('小道具');
    await sleep(500);
    
    // 查找并使用风物之诗琴
    await clickUIText('风物之诗琴');
    await sleep(1000);
}
```

---

## 自动路径导航 (AutoPathing)

### 相关文件
- **路径执行器**: `PathExecutor.cs:25-300`
- **导航**: `Navigation.cs:30-200`
- **航点**: `Waypoint.cs:10-50`

### 路径导航功能

```javascript
async function followPath(waypoints) {
    console.log('开始路径导航');
    
    for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        console.log(`前往航点 ${i + 1}: (${waypoint.x}, ${waypoint.y})`);
        
        // 移动到航点
        await navigateToPoint(waypoint.x, waypoint.y);
        
        // 执行航点动作
        if (waypoint.action) {
            await executeWaypointAction(waypoint.action);
        }
        
        await sleep(1000);
    }
    
    console.log('路径导航完成');
}

async function navigateToPoint(targetX, targetY) {
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
        // 获取当前位置
        const currentPos = genshin.getPositionFromMap();
        
        // 计算距离
        const distance = Math.sqrt(
            Math.pow(targetX - currentPos.X, 2) + 
            Math.pow(targetY - currentPos.Y, 2)
        );
        
        if (distance < 5) {
            console.log('已到达目标点');
            break;
        }
        
        // 计算移动方向
        const angle = Math.atan2(targetY - currentPos.Y, targetX - currentPos.X);
        
        // 调整相机朝向
        await adjustCameraToAngle(angle);
        
        // 向前移动
        keyDown('VK_W');
        await sleep(1000);
        keyUp('VK_W');
        
        retries++;
    }
}

async function adjustCameraToAngle(targetAngle) {
    const currentAngle = genshin.getCameraOrientation();
    const angleDiff = targetAngle - currentAngle;
    
    // 根据角度差调整鼠标移动
    const mouseMove = angleDiff * 100; // 调整系数
    moveMouseBy(mouseMove, 0);
}
```

---

## 自动吃药 (AutoEat)

### 相关文件
- **主任务**: `AutoEatTask.cs:27-181`
- **配置**: `AutoEatConfig.cs:10-60`
- **触发器**: `AutoEatTrigger.cs:20-143`
- **参数**: `AutoEatParam.cs:8-30`
- **食物类型**: `FoodEffectType.cs:8-23`

### 基础自动吃药功能

BGI提供了完整的自动吃药系统，支持两种工作模式：

#### 1. 便携营养袋模式（推荐）
```javascript
// 使用便携营养袋进行自动吃药
async function startAutoEat() {
    try {
        log.info('启动自动吃药功能...');
        
        // 调用BGI的自动吃药任务
        await dispatch({
            type: "AutoEat",
            config: null // 使用便携营养袋模式
        });
        
        log.info('自动吃药任务完成');
    } catch (error) {
        log.error('自动吃药失败:', error.message);
    }
}
```

#### 2. 指定食物模式
```javascript
// 使用指定食物进行吃药
async function eatSpecificFood(foodName) {
    try {
        log.info(`准备使用食物: ${foodName}`);
        
        await dispatch({
            type: "AutoEat",
            config: {
                foodName: foodName
            }
        });
        
        log.info(`已使用食物: ${foodName}`);
    } catch (error) {
        log.error('使用指定食物失败:', error.message);
    }
}

// 使用示例
await eatSpecificFood('蒙德土豆饼');
await eatSpecificFood('提瓦特煎蛋');
await eatSpecificFood('满足沙拉');
```

### 食物类型系统

BGI支持按食物效果类型进行分类管理：

#### 食物效果类型枚举
```javascript
// BGI内置的食物效果类型
const FoodEffectType = {
    RecoveryDish: 0,        // 恢复类料理
    ATKBoostingDish: 1,     // 攻击类料理  
    AdventurersDish: 2,     // 冒险类料理
    DEFBoostingDish: 3,     // 防御类料理
    Potion: 4,              // 药剂
    Other: 5                // 其他
};
```

#### 按类型使用食物
```javascript
// 使用攻击类料理
async function useAtkFood() {
    await dispatch({
        type: "AutoEat",
        config: {
            foodEffectType: 1 // ATKBoostingDish
        }
    });
}

// 使用防御类料理  
async function useDefFood() {
    await dispatch({
        type: "AutoEat",
        config: {
            foodEffectType: 3 // DEFBoostingDish
        }
    });
}

// 使用冒险类料理
async function useAdventureFood() {
    await dispatch({
        type: "AutoEat",
        config: {
            foodEffectType: 2 // AdventurersDish
        }
    });
}
```

### 战斗中的自动吃药

自动吃药功能特别适合在战斗过程中保持角色生存：

```javascript
async function combatWithAutoEat() {
    // 开始战斗前启用自动吃药
    const autoEatTask = dispatch({
        type: "AutoEat",
        config: null // 便携营养袋模式
    });
    
    // 同时进行战斗
    try {
        log.info('战斗开始，自动吃药已启用');
        
        // 这里可以添加战斗逻辑
        await performCombat();
        
    } finally {
        // 战斗结束后任务会自动完成
        log.info('战斗结束');
    }
}

async function performCombat() {
    // 模拟战斗过程
    for (let i = 0; i < 10; i++) {
        // 攻击敌人
        keyPress('VK_J'); // 普通攻击
        await sleep(1000);
        
        // 使用元素技能
        keyPress('VK_E');
        await sleep(2000);
        
        // 在这个过程中，AutoEat会自动监测血量并吃药
        log.info(`战斗轮次 ${i + 1}/10`);
    }
}
```

### 触发器模式

BGI的AutoEat功能还支持触发器模式，可以在后台持续监控：

**触发条件**：
- 检测到角色红血状态
- 检测到复活图标时自动复活
- 支持便携营养袋图标识别

**触发机制**：
- 检测间隔：150ms（可配置）
- 吃药间隔：1000ms（防止频繁吃药）
- 复活检测：2秒CD

### 配置参数

```javascript
// 自定义AutoEat配置
async function customAutoEat() {
    await dispatch({
        type: "AutoEat",
        config: {
            foodName: "满足沙拉",
            checkInterval: 200,    // 检测间隔（毫秒）
            eatInterval: 1500,     // 吃药间隔（毫秒）
            showNotification: true // 显示通知
        }
    });
}
```

### 实用示例

#### 1. 秘境自动吃药
```javascript
async function domainWithAutoEat() {
    // 进入秘境前设置自动吃药
    log.info('准备进入秘境，启用自动吃药');
    
    const autoEatPromise = dispatch({
        type: "AutoEat",
        config: null
    });
    
    // 执行秘境任务
    await performDomainChallenge();
}
```

#### 2. 世界BOSS战自动吃药
```javascript
async function bossFightWithHealing() {
    // 战斗前使用攻击类食物
    await dispatch({
        type: "AutoEat", 
        config: {
            foodEffectType: 1 // 攻击类料理
        }
    });
    
    await sleep(1000);
    
    // 启用持续自动吃药
    const healingTask = dispatch({
        type: "AutoEat",
        config: null
    });
    
    // 开始BOSS战
    await fightWorldBoss();
}
```

#### 3. 多类型食物轮换
```javascript
async function rotateBuffFoods() {
    const foodTypes = [
        { type: 1, name: "攻击类料理" },
        { type: 3, name: "防御类料理" },
        { type: 2, name: "冒险类料理" }
    ];
    
    for (const food of foodTypes) {
        log.info(`使用${food.name}`);
        
        await dispatch({
            type: "AutoEat",
            config: {
                foodEffectType: food.type
            }
        });
        
        await sleep(2000);
    }
}
```

### 注意事项

1. **便携营养袋优先**: 便携营养袋模式是最稳定的自动吃药方式
2. **装备检测**: 使用便携营养袋前需确保已装备到快捷栏
3. **食物库存**: 指定食物模式需要背包中有对应食物
4. **重复使用**: 同类型增益食物重复使用会刷新持续时间
5. **CD控制**: 系统会自动控制吃药间隔，避免浪费
6. **复活功能**: 触发器模式还包含自动复活功能

---

## 自动采集 (AutoPick)

### 相关文件
- **配置**: `AutoPickConfig.cs:10-60`
- **触发器**: `AutoPickTrigger.cs:20-120`

### 自动采集物品

```javascript
async function autoPickItems() {
    console.log('开始自动采集');
    
    // 启用自动采集（这个功能主要在C#端运行）
    // JavaScript中可以控制采集的开关和参数
    
    // 在特定区域巡游采集
    const collectingArea = {
        center: { x: 1500, y: 1200 },
        radius: 200
    };
    
    await patrolArea(collectingArea);
}

async function patrolArea(area) {
    const patrolPoints = generatePatrolPoints(area);
    
    for (const point of patrolPoints) {
        // 移动到巡逻点
        await navigateToPoint(point.x, point.y);
        
        // 在该点停留一段时间进行采集
        await sleep(3000);
        
        // 检查周围是否有可采集物品
        await lookAround();
    }
}

function generatePatrolPoints(area) {
    // 在指定区域内生成巡逻点
    const points = [];
    const numPoints = 8;
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const x = area.center.x + Math.cos(angle) * area.radius;
        const y = area.center.y + Math.sin(angle) * area.radius;
        points.push({ x, y });
    }
    
    return points;
}

async function lookAround() {
    // 转动相机查看周围
    for (let i = 0; i < 4; i++) {
        moveMouseBy(200, 0); // 向右转90度
        await sleep(500);
    }
}
```

---

## 自动秘境 (AutoDomain)

### 相关文件
- **主任务**: `AutoDomainTask.cs:25-200`
- **配置**: `AutoDomainConfig.cs:10-80`
- **参数**: `AutoDomainParam.cs:8-40`

### 秘境自动化

```javascript
async function autoDomainRun(domainName, times = 1) {
    console.log(`准备进行 ${times} 次 ${domainName} 秘境`);
    
    for (let run = 1; run <= times; run++) {
        console.log(`第 ${run}/${times} 次挑战`);
        
        // 传送到秘境入口
        await genshin.tp(...getDomainCoords(domainName));
        await sleep(3000);
        
        // 进入秘境
        await enterDomain();
        
        // 等待挑战完成（这里需要结合战斗自动化）
        await waitForDomainComplete();
        
        // 领取奖励
        await claimRewards();
        
        await sleep(2000);
    }
    
    console.log('秘境挑战完成');
}

function getDomainCoords(domainName) {
    const domainCoords = {
        '紫英庭': [1200, 800],
        '太山府': [1800, 1200],
        '菫色之庭': [1600, 900]
    };
    
    return domainCoords[domainName] || [0, 0];
}

async function enterDomain() {
    // 与秘境入口交互
    keyPress('VK_F');
    await sleep(2000);
    
    // 点击进入按钮
    await clickUIText('进入');
    await sleep(1000);
    
    // 确认进入
    await clickUIText('确认');
    await sleep(5000); // 等待加载
}

async function waitForDomainComplete() {
    // 等待战斗结束的标志
    let completed = false;
    let timeout = 0;
    const maxTimeout = 300; // 5分钟超时
    
    while (!completed && timeout < maxTimeout) {
        const gameImage = captureGameRegion();
        const ocrResult = gameImage.ocr();
        
        // 检查是否出现完成标志
        const completionMarkers = ['挑战完成', '获得奖励', '继续'];
        completed = ocrResult.Regions.some(region =>
            completionMarkers.some(marker => region.Text.includes(marker))
        );
        
        if (!completed) {
            await sleep(1000);
            timeout++;
        }
    }
    
    return completed;
}
```

---

## 组合使用示例

### 日常自动化流程

```javascript
async function dailyAutoRoutine() {
    console.log('开始执行日常自动化流程');
    
    // 1. 返回主界面
    await genshin.returnMainUi();
    
    // 2. 检查队伍配置
    await checkTeamComposition();
    
    // 3. 执行钓鱼任务
    console.log('=== 开始钓鱼任务 ===');
    await fishingRoute();
    
    // 4. 执行采集任务
    console.log('=== 开始采集任务 ===');
    await autoPickItems();
    
    // 5. 执行秘境任务
    console.log('=== 开始秘境任务 ===');
    await autoDomainRun('紫英庭', 3);
    
    // 6. 完成其他日常
    console.log('=== 领取奖励 ===');
    await genshin.claimBattlePassRewards();
    await genshin.claimEncounterPointsRewards();
    
    console.log('日常自动化流程完成');
}
```

---

## 自动寻路和移动控制

BGI提供了完整的移动控制和导航功能，包括位置获取、视角控制、传送功能以及内置的防卡死机制。

### BGI提供的视角控制API

#### 获取相机朝向
```javascript
// 获取当前相机朝向角度（0-360度）
const angle = genshin.getCameraOrientation();
log.info('当前相机朝向:', angle);
```

**实现原理**：
- 通过小地图图像识别计算相机朝向
- 使用MiniMapPreprocessor进行角度预测
- 返回0-360度的标准化角度值

#### 视角调整控制
```javascript
// 通过鼠标移动控制视角
moveMouseBy(-100, 0); // 向左转动视角
moveMouseBy(100, 0);  // 向右转动视角

// 计算目标角度
function calculateTargetAngle(currentX, currentY, targetX, targetY) {
    const deltaX = targetX - currentX;
    const deltaY = targetY - currentY;
    const rad = Math.atan2(-deltaY, -deltaX);
    return (rad * (180 / Math.PI) + 360) % 360;
}

// 视角调整示例
async function adjustCameraToTarget(targetPos) {
    const currentPos = genshin.getPositionFromMap();
    const currentAngle = genshin.getCameraOrientation();
    const targetAngle = calculateTargetAngle(currentPos.X, currentPos.Y, targetPos.X, targetPos.Y);
    
    let angleDiff = (targetAngle - currentAngle + 180) % 360 - 180;
    if (angleDiff < -180) angleDiff += 360;
    
    if (Math.abs(angleDiff) > 5) {
        const moveStep = Math.round(angleDiff * 2); // 调整灵敏度
        moveMouseBy(-moveStep, 0);
        await sleep(100);
    }
}
```

### BGI提供的位置和移动API

#### 位置获取功能
```javascript
// 获取小地图位置（支持缓存）
const position = genshin.getPositionFromMap('Teyvat', 900); // 900ms缓存
log.info(`当前位置: (${position.X}, ${position.Y})`);

// 局部匹配版本（更精确，当已知大概位置时）
const precisePos = genshin.getPositionFromMap('Teyvat', knownX, knownY);

// 获取大地图位置
const bigMapPos = genshin.getPositionFromBigMap('Teyvat');
```

#### 传送功能
```javascript
// 基础传送
await genshin.tp(100, 200);

// 完整参数传送
await genshin.tp(100, 200, 'Teyvat', false); // 指定地图和强制选项

// 传送到七天神像
await genshin.tpToStatueOfTheSeven();
```

#### 移动控制
```javascript
// 基础移动控制
keyDown('VK_W');  // 开始向前移动
await sleep(1000);
keyUp('VK_W');    // 停止移动

keyPress('VK_SPACE'); // 跳跃

// 复合移动示例
async function moveToTarget(targetPos) {
    let currentPos = genshin.getPositionFromMap();
    let distance = Math.sqrt(
        Math.pow(targetPos.X - currentPos.X, 2) + 
        Math.pow(targetPos.Y - currentPos.Y, 2)
    );
    
    while (distance > 5) {
        // 调整视角朝向目标
        await adjustCameraToTarget(targetPos);
        
        // 移动
        keyDown('VK_W');
        await sleep(500);
        keyUp('VK_W');
        
        // 更新位置
        currentPos = genshin.getPositionFromMap();
        distance = Math.sqrt(
            Math.pow(targetPos.X - currentPos.X, 2) + 
            Math.pow(targetPos.Y - currentPos.Y, 2)
        );
        
        log.info(`当前距离目标: ${distance.toFixed(2)}`);
    }
}
```

### BGI内置的防卡死机制

BGI在`AutoPathing`模块中提供了完整的防卡死系统，主要包括：

#### 1. TrapEscaper - 智能脱困器
**核心功能**：
- **小脱困机制**：检测误入攀爬状态时自动脱离
- **大脱困机制**：卡住超过5秒时执行复杂脱困动作
- **智能角度调整**：脱困时添加随机角度避免重复卡死

**脱困策略**：
1. 后退 + 跳跃（1000ms）
2. 左移 + 跳跃（700ms）  
3. 右移 + 跳跃（700ms）
4. 随机角度调整（30-45度）

#### 2. PathExecutor - 路径执行器
**防卡死检测**：
- 监控角色位置变化
- 超过5秒无显著移动触发脱困
- 连续卡死次数统计和处理

#### 3. JS脚本中的防卡死实践
```javascript
// 简单的卡死检测
let lastPosition = null;
let stuckCheckTime = 0;

async function checkIfStuck() {
    const currentPos = genshin.getPositionFromMap();
    const now = Date.now();
    
    if (lastPosition) {
        const movement = Math.sqrt(
            Math.pow(currentPos.X - lastPosition.X, 2) + 
            Math.pow(currentPos.Y - lastPosition.Y, 2)
        );
        
        if (movement < 2 && now - stuckCheckTime > 5000) {
            log.warn("检测到可能卡死，尝试简单脱困");
            
            // 简单脱困动作
            keyUp('VK_W'); // 停止移动
            await sleep(100);
            
            keyDown('VK_S'); // 后退
            await sleep(500);
            keyUp('VK_S');
            
            keyPress('VK_SPACE'); // 跳跃
            await sleep(200);
            keyPress('VK_SPACE'); // 双跳
            
            // 随机调整视角
            const randomTurn = (Math.random() - 0.5) * 200;
            moveMouseBy(randomTurn, 0);
            
            stuckCheckTime = now;
            return true;
        }
    }
    
    lastPosition = {...currentPos};
    return false;
}

// 在移动循环中使用
async function moveWithStuckDetection(targetPos) {
    while (true) {
        if (await checkIfStuck()) {
            await sleep(1000); // 脱困后短暂等待
            continue;
        }
        
        // 正常移动逻辑
        const currentPos = genshin.getPositionFromMap();
        const distance = Math.sqrt(
            Math.pow(targetPos.X - currentPos.X, 2) + 
            Math.pow(targetPos.Y - currentPos.Y, 2)
        );
        
        if (distance < 5) break;
        
        await adjustCameraToTarget(targetPos);
        keyDown('VK_W');
        await sleep(800);
        keyUp('VK_W');
    }
}
```

### BGI视角控制技术细节

#### CameraRotateTask内部实现
BGI的`CameraRotateTask`类提供了高精度的视角控制：

**分级速度控制**：
- 角度差 > 90度：4倍速度快速调整
- 角度差 > 30度：3倍速度中等调整  
- 角度差 > 5度：2倍速度精细调整
- 其他情况：1倍速度微调

**DPI自适应**：
- 自动检测系统DPI缩放
- 确保在不同显示设置下精确控制

#### 最佳实践建议

**视角控制**：
- 使用`getCameraOrientation()`获取准确朝向
- 大幅度转向时分步执行，避免过快
- 结合`sleep()`控制调整频率

**位置监控**：
- 利用缓存参数提高`getPositionFromMap()`性能
- 定期检查位置变化判断移动状态
- 合理设置距离阈值避免无限接近

**移动控制**：
- 优先使用传送API处理长距离移动
- 短距离移动结合视角调整和键盘控制
- 添加适当的延时避免操作过快

### 使用示例

```javascript
async function autoNavigateExample() {
    const targetPosition = { X: 1000, Y: 2000 };
    
    // 1. 尝试传送到附近
    try {
        await genshin.tp(targetPosition.X, targetPosition.Y);
        log.info("传送成功");
        await sleep(3000); // 等待传送完成
    } catch (error) {
        log.warn("传送失败，使用步行模式");
    }
    
    // 2. 精确移动到目标
    await moveWithStuckDetection(targetPosition);
    
    log.info("已到达目标位置");
}
```

---

## 自动伐木 (AutoWood)

### 相关文件
- **主任务**: `AutoWoodTask.cs:25-552`
- **配置**: `AutoWoodConfig.cs:8-60`
- **木材统计**: `WoodStatisticsPrinter.cs:132-383`

### 基础自动伐木功能

BGI提供了完整的自动伐木系统，支持OCR识别木材数量并可设置每日上限。

#### 伐木前准备
```javascript
// ⚠️ 重要：使用自动伐木功能前，必须装备「王树瑞佑」小道具
// 获取方式：须弥「无郁稠林」声望奖励
// 装备位置：小道具快捷栏 Z键位置
```

#### 调用BGI自动伐木
```javascript
// 自动伐木功能主要由C#端实现
// JavaScript中可以通过任务调度系统启动

async function runAutoWood() {
    try {
        log.info('启动自动伐木任务...');

        // 通过dispatcher启动伐木任务
        await dispatcher.runTask({
            type: "AutoWood",
            config: {
                woodRoundNum: 100,        // 伐木次数
                woodDailyMaxCount: 2000   // 每日木材数量上限
            }
        });

        log.info('自动伐木任务完成');
    } catch (error) {
        log.error('自动伐木失败:', error.message);
    }
}
```

### 伐木工作流程

BGI自动伐木采用「退出重登」策略来刷新树木资源：

**核心流程**：
1. 按下 Z键 触发「王树瑞佑」技能伐木
2. OCR识别获取的木材种类和数量（可选）
3. 按下 ESC 打开菜单，选择退出到主界面
4. 等待进入登录界面
5. 重新进入游戏
6. 重复上述流程

**技术细节**：
- 首次OCR会重复识别，选择最长结果
- 后续OCR直接使用首次识别的木材数量
- 支持B服（Bilibili服）特殊登录流程
- 自动检测「王树瑞佑」图标确保技能可用

### 木材种类和数量统计

BGI支持24种游戏内木材的OCR识别：

```javascript
// BGI内置木材列表
const woodTypes = [
    "悬铃木", "白梣木", "炬木", "椴木", "香柏木",
    "刺葵木", "柽木", "辉木", "业果木", "证悟木",
    "枫木", "垂香木", "杉木", "竹节", "却砂木",
    "松木", "萃华木", "桦木", "孔雀木", "梦见木",
    "御伽木", "燃爆木", "桃椰子木", "灰灰楼林木",
    "白栗栎木"
];

// 伐木统计示例输出
// [自动伐木] 木材竹节累积获取数量：150
// [自动伐木] 木材杉木累积获取数量：120
// [自动伐木] 木材松木累积获取数量：90
```

### 智能停止条件

BGI提供两种自动停止机制：

#### 1. 数量上限停止
```javascript
// 设置单种木材数量上限
const config = {
    woodRoundNum: 200,
    woodDailyMaxCount: 2000  // 任意木材达到2000停止
};

// 当任意木材数量达到上限时，自动伐木会停止
```

#### 2. 空白检测停止
```javascript
// 连续3次OCR未识别到木材，判定为附近无树
// 自动停止伐木任务
// 原因可能：
// - 当前位置无可伐树木
// - 已达每日伐木数量上限（每日最多1500-2000个）
```

### 性能优化配置

```javascript
// 在manifest.json中配置伐木参数
{
    "autoWoodConfig": {
        "woodCountOcrEnabled": true,      // 是否启用OCR木材统计
        "afterZSleepDelay": 3000,         // Z键后等待时间（毫秒）
        "pressTwoEscEnabled": false       // 是否按两次ESC
    }
}
```

### 实战示例

#### 快速伐木模式
```javascript
async function quickWoodFarm() {
    // 适合快速刷取木材，不统计数量
    await dispatcher.runTask({
        type: "AutoWood",
        config: {
            woodRoundNum: 50,
            woodCountOcrEnabled: false  // 关闭OCR提高速度
        }
    });
}
```

#### 精确统计模式
```javascript
async function precisionWoodFarm() {
    // 统计木材数量，达到上限自动停止
    await dispatcher.runTask({
        type: "AutoWood",
        config: {
            woodRoundNum: 500,           // 设置较大值
            woodDailyMaxCount: 2000,     // 实际会在达到此上限时停止
            woodCountOcrEnabled: true    // 启用OCR统计
        }
    });
}
```

### 注意事项

1. **小道具装备**：必须装备「王树瑞佑」到Z键位置
2. **首次使用**：首次运行时OCR识别失败会自动关闭OCR功能
3. **登录限制**：频繁退出重登可能触发验证码（建议设置合理间隔）
4. **位置选择**：建议在树木密集区域使用（如须弥雨林）
5. **每日上限**：游戏有每日伐木数量限制（约2000个）
6. **B服支持**：自动检测并适配Bilibili服务器登录流程

---

## 自动跳过对话 (AutoSkip)

### 相关文件
- **触发器**: `AutoSkipTrigger.cs:30-1006`
- **配置**: `AutoSkipConfig.cs:10-80`
- **自动追踪**: `AutoTrackTask.cs:20-150`

### 功能概述

AutoSkip是BGI最智能的自动化功能之一，支持：
- ✅ 自动快速跳过对话
- ✅ 智能选择对话选项
- ✅ 自动领取每日委托奖励
- ✅ 自动探索派遣
- ✅ 自动邀约活动
- ✅ 自动点击黑屏剧情
- ✅ 关闭剧情弹窗

### 基础配置

```javascript
// AutoSkip作为触发器(Trigger)运行，在后台持续监控
// 配置通过 settings.json 进行

const autoSkipConfig = {
    "enabled": true,                      // 启用自动剧情
    "runBackgroundEnabled": true,         // 后台运行
    "quicklySkipConversationsEnabled": true,  // 快速跳过对话
    "autoHangoutEventEnabled": true,      // 自动邀约事件
    "autoGetDailyRewardsEnabled": true,   // 自动领取每日委托
    "autoReExploreEnabled": true,         // 自动探索派遣
    "submitGoodsEnabled": true,           // 自动提交物品
    "closePopupPagedEnabled": true        // 关闭弹出页
};
```

### 对话选项选择策略

BGI支持多种对话选项选择模式：

#### 1. 智能优先级选择（推荐）
```javascript
// 选择优先级：
// 1. 自定义优先选项（用户配置）
// 2. 内置关键词匹配（select_options.json）
// 3. 橙色特殊选项（每日委托、探索派遣等）
// 4. 排除暂停关键词（pause_options.json）
// 5. 默认选择（最后一个/第一个/随机）
```

#### 2. 自定义优先选项
```javascript
{
    "selectChatOptionType": "CustomPriority",
    "customPriorityOptions": "我想帮助你\n确认\n好的"
    // 多个选项用换行、分号或逗号分隔
}
```

#### 3. 关键词配置文件

**选择关键词** (`Assets/Config/Skip/select_options.json`):
```json
[
    "帮助",
    "确认",
    "好的",
    "同意"
]
```

**暂停关键词** (`Assets/Config/Skip/pause_options.json`):
```json
[
    "离开",
    "拒绝",
    "结束对话"
]
```

#### 4. 交互键模式（5.2版本新增）
```javascript
// 使用F键直接选择，无需鼠标点击
{
    "selectChatOptionType": "UseInteractionKey",
    // W键向上选择，S键向下选择，F键确认
}
```

### 特殊功能

#### 自动领取每日委托
```javascript
// 当检测到"每日委托"橙色选项时
// 自动点击并等待奖励发放
// 识别原石图标后自动按ESC关闭

async function waitDailyReward() {
    // BGI会自动：
    // 1. 识别"每日委托"选项并点击
    // 2. 等待最多10秒
    // 3. 检测到原石图标
    // 4. 按下ESC关闭奖励界面
}
```

#### 自动探索派遣
```javascript
// 检测到"探索派遣"选项时
// 自动执行一键远征任务

async function autoExpedition() {
    // BGI会自动：
    // 1. 点击"探索派遣"选项
    // 2. 等待界面打开（800ms）
    // 3. 执行一键远征逻辑
    //    - 识别所有角色卡片
    //    - 点击派遣按钮
    //    - 确认派遣
}
```

#### 自动邀约活动
```javascript
// 自动邀约配置
{
    "autoHangoutEventEnabled": true,
    "autoHangoutEndChoose": "甜甜花鸡",  // 指定结局分支
    "autoHangoutPressSkipEnabled": true   // 自动点击跳过按钮
}

// 邀约选项优先级：
// 1. 分支关键词匹配（指定结局）
// 2. 未选择的选项（探索新内容）
// 3. 已选择的第一个选项
```

### 黑屏剧情处理

```javascript
// BGI自动检测黑屏剧情（黑色占比50%-98.9%）
// 自动点击屏幕推进剧情
// 每1200ms最多点击一次，避免过快
```

### 剧情弹窗自动关闭

#### 1. 通用弹窗
```javascript
// 检测页面关闭按钮（X）
// 自动按ESC关闭弹出页
// 不会在大地图界面触发
```

#### 2. 道具弹窗
```javascript
// 检测屏幕底部实心三角形
// 支持黄色和蓝色三角（活动玩法介绍）
// 自动点击三角跳过道具展示
```

#### 3. 角色信息弹窗
```javascript
// 初见角色时的信息弹窗
// 通过颜色和形状识别（黄色+藏青色矩形）
// 自动点击空白区域关闭
```

### 物品提交功能

```javascript
// 自动识别剧情中需要提交的物品
// 流程：
// 1. 检测感叹号图标
// 2. 识别米黄色物品矩形
// 3. 依次点击物品
// 4. 点击"放入"按钮
// 5. 点击"交付"按钮完成

{
    "submitGoodsEnabled": true  // 启用自动提交物品
}
```

### JavaScript使用示例

```javascript
// AutoSkip作为触发器运行，通常不需要JS调用
// 但可以通过配置控制行为

async function setupAutoSkip() {
    // 读取并修改配置
    const config = TaskContext.Instance().Config.AutoSkipConfig;

    config.QuicklySkipConversationsEnabled = true;
    config.AutoHangoutEventEnabled = false;  // 关闭自动邀约
    config.SelectChatOptionType = "ClickFirstChatOption";  // 选择第一个选项

    log.info('AutoSkip配置已更新');
}

// 手动触发对话选择（在非触发器模式下）
async function manualChatOption() {
    const gameImage = captureGameRegion();

    // 识别对话气泡
    const optionIcon = gameImage.find(_autoSkipAssets.OptionIconRo);
    if (!optionIcon.IsEmpty()) {
        log.info('检测到对话选项');
        // BGI会自动处理
    }
}
```

### 最佳实践

#### 剧情任务推荐配置
```json
{
    "quicklySkipConversationsEnabled": true,
    "selectChatOptionType": "ClickLastChatOption",
    "autoGetDailyRewardsEnabled": true,
    "submitGoodsEnabled": true,
    "closePopupPagedEnabled": true,
    "beforeClickConfirmDelay": 0,
    "afterChooseOptionSleepDelay": 100
}
```

#### 邀约活动推荐配置
```json
{
    "autoHangoutEventEnabled": true,
    "autoHangoutEndChoose": "目标结局",
    "autoHangoutPressSkipEnabled": true,
    "autoHangoutChooseOptionSleepDelay": 500
}
```

### 注意事项

1. **选项关键词**：合理配置pause/select关键词避免误选
2. **延迟设置**：网络较慢时适当增加延迟
3. **后台模式**：启用后台运行可在原神最小化时工作
4. **橙色选项**：特殊选项（委托、派遣）优先级最高
5. **邀约分支**：提前查好想要的结局关键词

---

## 自动圣遗物分解 (AutoArtifactSalvage)

### 相关文件
- **主任务**: `AutoArtifactSalvageTask.cs:35-815`
- **配置**: `AutoArtifactSalvageConfig.cs:10-80`
- **参数**: `AutoArtifactSalvageTaskParam.cs:8-90`

### 功能概述

AutoArtifactSalvage提供智能的圣遗物分解功能，支持：
- ✅ 快速分解1-4星圣遗物
- ✅ JavaScript自定义筛选5星圣遗物
- ✅ 套装过滤功能
- ✅ OCR识别圣遗物属性
- ✅ 词条分析和评分

### 基础快速分解

```javascript
// 快速分解低星圣遗物
async function quickSalvage(star) {
    try {
        log.info(`开始分解${star}星圣遗物`);

        await dispatcher.runTask({
            type: "AutoArtifactSalvage",
            config: {
                star: star,  // 1-4 星级
                returnToMainUi: true
            }
        });

        log.info('圣遗物分解完成');
    } catch (error) {
        log.error('分解失败:', error.message);
    }
}

// 使用示例
await quickSalvage(3);  // 分解3星圣遗物
await quickSalvage(4);  // 分解4星圣遗物
```

### 高级筛选 - JavaScript脚本模式

#### 1. 基础词条筛选
```javascript
// 定义筛选脚本
const filterScript = `
// ArtifactStat对象包含圣遗物完整信息
var artifact = ArtifactStat;

// 检查副词条
var minorAffixes = artifact.MinorAffixes;
var hasGoodAffix = false;

for (var i = 0; i < minorAffixes.length; i++) {
    var affix = minorAffixes[i];
    // 暴击率、暴击伤害、攻击力百分比都保留
    if (affix.Type === "CRITRate" ||
        affix.Type === "CRITDMG" ||
        affix.Type === "ATKPercent") {
        hasGoodAffix = true;
        break;
    }
}

// Output控制是否分解（true=分解，false=保留）
Output = !hasGoodAffix;
`;

await dispatcher.runTask({
    type: "AutoArtifactSalvage",
    config: {
        star: 5,
        javaScript: filterScript,
        maxNumToCheck: 500  // 最多检查500个
    }
});
```

#### 2. 词条数值筛选
```javascript
const advancedFilter = `
var artifact = ArtifactStat;
var totalScore = 0;

// 计算词条总分
for (var i = 0; i < artifact.MinorAffixes.length; i++) {
    var affix = artifact.MinorAffixes[i];
    switch(affix.Type) {
        case "CRITRate":      // 暴击率
            totalScore += affix.Value * 2;  // 1%暴击率 = 2分
            break;
        case "CRITDMG":       // 暴击伤害
            totalScore += affix.Value;      // 1%暴伤 = 1分
            break;
        case "ATKPercent":    // 攻击力%
            totalScore += affix.Value * 0.5;
            break;
    }
}

// 总分低于20分的圣遗物分解
Output = totalScore < 20;
`;
```

#### 3. 套装过滤
```javascript
// 只处理指定套装的圣遗物
await dispatcher.runTask({
    type: "AutoArtifactSalvage",
    config: {
        star: 5,
        javaScript: filterScript,
        artifactSetFilter: "逐影猎人,黄金剧团,沉沦之心",  // 多个套装用逗号分隔
        maxNumToCheck: 200
    }
});
```

### ArtifactStat对象结构

```javascript
// JavaScript脚本中可访问的圣遗物对象
{
    Name: "翠绿之影的鲜花",          // 名称
    MainAffix: {                     // 主词条
        Type: "HP",                  // 生命值
        Value: 4780                  // 数值
    },
    MinorAffixes: [                  // 副词条数组
        {
            Type: "CRITRate",        // 暴击率
            Value: 7.8,              // 数值
            IsUnactivated: false     // 是否未激活
        },
        {
            Type: "CRITDMG",         // 暴击伤害
            Value: 14.0,
            IsUnactivated: false
        },
        {
            Type: "ATKPercent",      // 攻击力%
            Value: 5.8,
            IsUnactivated: true      // 未激活词条
        }
    ],
    Level: 20                        // 强化等级
}
```

### 词条类型枚举

```javascript
// 主词条和副词条类型
const AffixTypes = {
    // 基础属性
    "HP": "生命值",
    "HPPercent": "生命值百分比",
    "ATK": "攻击力",
    "ATKPercent": "攻击力百分比",
    "DEF": "防御力",
    "DEFPercent": "防御力百分比",

    // 战斗属性
    "CRITRate": "暴击率",
    "CRITDMG": "暴击伤害",
    "ElementalMastery": "元素精通",
    "EnergyRecharge": "元素充能效率",

    // 元素伤害（仅主词条）
    "PyroDMGBonus": "火元素伤害加成",
    "HydroDMGBonus": "水元素伤害加成",
    "DendroDMGBonus": "草元素伤害加成",
    "ElectroDMGBonus": "雷元素伤害加成",
    "AnemoDMGBonus": "风元素伤害加成",
    "CryoDMGBonus": "冰元素伤害加成",
    "GeoDMGBonus": "岩元素伤害加成",
    "PhysicalDMGBonus": "物理伤害加成",

    // 其他（仅主词条）
    "HealingBonus": "治疗加成"
};
```

### 实战脚本示例

#### 输出流派筛选
```javascript
// 保留高输出词条的圣遗物
const dpsFilter = `
var totalValue = 0;
for (var i = 0; i < ArtifactStat.MinorAffixes.length; i++) {
    var affix = ArtifactStat.MinorAffixes[i];
    if (affix.Type === "CRITRate") {
        totalValue += affix.Value * 2;
    } else if (affix.Type === "CRITDMG") {
        totalValue += affix.Value;
    } else if (affix.Type === "ATKPercent") {
        totalValue += affix.Value * 0.75;
    } else if (affix.Type === "ElementalMastery") {
        totalValue += affix.Value * 0.25;
    }
}

// 双暴+攻击 总价值 < 30 的分解
Output = totalValue < 30;
`;
```

#### 辅助流派筛选
```javascript
// 保留充能、精通、生命的圣遗物
const supportFilter = `
var hasGoodStat = false;
for (var i = 0; i < ArtifactStat.MinorAffixes.length; i++) {
    var affix = ArtifactStat.MinorAffixes[i];
    // 充能效率 > 10% 或 元素精通 > 40
    if ((affix.Type === "EnergyRecharge" && affix.Value > 10) ||
        (affix.Type === "ElementalMastery" && affix.Value > 40) ||
        (affix.Type === "HPPercent" && affix.Value > 10)) {
        hasGoodStat = true;
        break;
    }
}

Output = !hasGoodStat;
`;
```

### 配置参数详解

```javascript
{
    star: 5,                          // 星级（1-5）
    javaScript: "脚本内容",           // 自定义JS筛选脚本
    artifactSetFilter: "套装1,套装2", // 套装过滤（逗号分隔）
    maxNumToCheck: 500,               // 最大检查数量
    recognitionFailurePolicy: "Skip",  // 识别失败策略：Skip跳过 / Throw抛出异常
    returnToMainUi: true              // 完成后返回主界面
}
```

### 注意事项

1. **JavaScript限制**：脚本执行时间限制3秒
2. **Output变量**：必须设置布尔类型的Output变量
3. **未激活词条**：`IsUnactivated=true`表示灰色未激活词条
4. **识别失败**：首次使用建议设置`recognitionFailurePolicy: "Throw"`排查问题
5. **套装过滤**：需要模型支持，确保BGI版本>=0.52.0
6. **复查确认**：5星筛选后建议手动复查再分解

---

## 自动七圣召唤 (AutoGeniusInvokation)

### 相关文件
- **主任务**: `AutoGeniusInvokationTask.cs:6-27`
- **配置**: `AutoGeniusInvokationConfig.cs:10-50`
- **策略解析**: `ScriptParser.cs:15-200`

### 功能概述

BGI提供了基于策略脚本的自动七圣召唤系统，可以：
- ✅ 自动对战NPC
- ✅ 自定义出牌策略
- ✅ 角色技能调度
- ✅ 元素骰子管理

### 基础使用

```javascript
// 自动七圣召唤需要预先编写策略文件
async function runGeniusInvokation(strategyFile) {
    try {
        // 读取策略文件
        const strategyContent = file.readTextSync(strategyFile);

        await dispatcher.runTask({
            type: "AutoGeniusInvokation",
            config: {
                strategyContent: strategyContent
            }
        });

        log.info('七圣召唤完成');
    } catch (error) {
        log.error('七圣召唤失败:', error.message);
    }
}

// 使用示例
await runGeniusInvokation("strategies/genius_invokation.txt");
```

### 策略文件格式

策略文件采用特定格式定义对战行为：

```
# 七圣召唤策略示例

[角色配置]
角色1: 甘雨
角色2: 凝光
角色3: 诺艾尔

[对战策略]
# 回合开始
回合开始:
  - 切换角色: 甘雨
  - 使用技能: 元素战技

# 根据情况调整
如果 生命值 < 50%:
  - 切换角色: 诺艾尔
  - 使用技能: 元素爆发

否则:
  - 使用技能: 普通攻击
```

**注意**：
- 策略文件格式由BGI内部定义
- 建议参考BGI官方示例策略
- JavaScript主要用于启动任务，不直接控制对战逻辑

### 注意事项

1. **策略编写**：需要熟悉七圣召唤规则
2. **NPC对战**：主要用于挑战NPC，PVP需谨慎
3. **卡组配置**：策略文件需与卡组匹配
4. **异常处理**：对战异常会自动终止任务

---

## 自动开箱 (AutoOpenChest)

### 相关文件
- **主任务**: `AutoOpenChestTask.cs:12-104`
- **资源**: `AutoOpenChestAssets.cs:8-40`

### 功能概述

自动识别并走向宝箱，支持：
- ✅ 宝箱图标识别
- ✅ 自动走向宝箱
- ✅ F键开启宝箱
- ✅ 地脉花识别（实验性）

### 基础使用

```javascript
async function autoOpenChest() {
    try {
        log.info('开始自动开箱');

        await dispatcher.runTask({
            type: "AutoOpenChest"
        });

        log.info('自动开箱完成');
    } catch (error) {
        log.error('开箱失败:', error.message);
    }
}
```

### 工作原理

```javascript
// 开箱流程：
// 1. 识别屏幕上的宝箱图标
// 2. 计算宝箱相对位置
// 3. 调整视角朝向宝箱
// 4. 按W键向前移动
// 5. 靠近后检测F图标
// 6. 按F开启宝箱

// 限制：
// - 最多持续60秒
// - 需要宝箱在视野范围内
// - 不支持隐藏宝箱
```

### 注意事项

1. **视野限制**：宝箱必须在屏幕可见范围内
2. **障碍物**：无法绕过障碍物，可能卡住
3. **地脉花**：地脉花识别功能仍在开发中
4. **超时机制**：60秒未开启会自动退出

---

## 其他Auto功能

### AutoStygianOnslaught（自动暗刷）

```javascript
// 自动暗涌深渊挑战
await dispatcher.runTask({
    type: "AutoStygianOnslaught"
});
```

### AutoTrackPath（自动追踪路径）

```javascript
// 自动追踪任务路径
await dispatcher.runTask({
    type: "AutoTrackPath"
});
```

---

## 注意事项

1. **资源管理**: Auto功能会消耗树脂等游戏资源，使用前请确认
2. **错误处理**: 自动化过程中可能遇到网络波动、界面变化等问题，需要适当的错误处理
3. **时间控制**: 合理设置延时，避免操作过快导致识别失败
4. **账号安全**: 长时间使用自动化功能需要注意账号安全
5. **功能组合**: 不同Auto功能可以组合使用，但需要注意状态切换和资源冲突
6. **OCR准确性**: 部分功能依赖OCR识别，可能存在识别错误
7. **版本兼容**: 游戏更新可能导致自动化功能失效，需要等待BGI更新

## 调试技巧

```javascript
// 添加调试信息
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// 截图调试
function debugScreenshot(description) {
    const gameImage = captureGameRegion();
    // 这里可以保存截图用于调试
    debugLog(`截图: ${description}`);
}
```

---

## 版本信息

- **文档版本**: v2.0.0
- **最后更新**: 2026年1月19日
- **适用BGI版本**: >=0.52.0
- **维护状态**: 活跃维护

## 变更记录

- v2.0.0 (2026-01-19):
  - ✨ **重大更新**: 补充完整的Auto系列功能文档
  - ✨ **新增**: AutoWood（自动伐木）完整功能说明和使用示例
  - ✨ **新增**: AutoSkip（自动跳过对话）详细配置指南和最佳实践
  - ✨ **新增**: AutoArtifactSalvage（自动圣遗物分解）JavaScript筛选脚本指南
  - ✨ **新增**: AutoGeniusInvokation（自动七圣召唤）策略文件使用方法
  - ✨ **新增**: AutoOpenChest（自动开箱）功能说明
  - ✨ **新增**: AutoStygianOnslaught（自动暗刷）基础文档
  - ✨ **新增**: AutoTrackPath（自动追踪路径）基础文档
  - 🔧 **完善**: AutoEat（自动吃药）保持原有详细说明
  - 🔧 **完善**: 所有Auto功能的相关文件路径索引
  - 🔧 **完善**: OCR准确性和版本兼容性注意事项
- v1.1.0 (2026-01-18): 更新文档日期

