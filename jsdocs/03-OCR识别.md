# JavaScript脚本开发 - OCR识别功能

## 概述

BGI集成了强大的OCR（光学字符识别）功能，主要基于PaddleOCR引擎，支持中英文混合识别。OCR功能通过`RecognitionObject`类和相关识别对象暴露给JavaScript环境。

**相关代码位置**:
- **OCR结果类型**: `BetterGenshinImpact\Core\Recognition\OCR\OcrResult.cs:4-68`
- **识别对象类型**: `BetterGenshinImpact\Core\Recognition\RecognitionObject.cs`
- **引擎注册位置**: `EngineExtend.cs:59` - RecognitionObject类型注册

## 数据结构

### OCR区域参数结构

所有OCR函数都要求传入标准的区域参数对象：

```javascript
// OCR区域参数结构（必须包含所有属性）
var ocrRegion = {
    X: 100,        // 起始X坐标（必须为数字）
    Y: 200,        // 起始Y坐标（必须为数字）
    WIDTH: 300,    // 区域宽度（必须为正数）
    HEIGHT: 50     // 区域高度（必须为正数）
};
```

**⚠️ 重要注意事项**：
- 所有属性（X、Y、WIDTH、HEIGHT）都是必需的
- 所有属性值必须是有效的数字类型
- WIDTH和HEIGHT必须为正数
- 传入undefined、null或缺少属性的对象会导致错误

### OcrResultRegion
单个OCR识别区域的结果。

```javascript
// OcrResultRegion 结构
{
    Rect: {          // RotatedRect 旋转矩形
        Center: { X: number, Y: number },  // 中心点坐标
        Size: { Width: number, Height: number }, // 尺寸
        Angle: number  // 旋转角度
    },
    Text: string,    // 识别出的文字
    Score: float     // 置信度分数 (0.0 - 1.0)
}
```

**代码位置**: `OcrResult.cs:10`

### OcrRecognizerResult
OCR识别器的整体结果。

```javascript
// OcrRecognizerResult 结构
{
    Text: string,    // 合并后的识别文本
    Score: float     // 平均置信度
}
```

**代码位置**: `OcrResult.cs:12-34`

### OcrResult
完整的OCR识别结果，包含多个识别区域。

```javascript
// OcrResult 结构
{
    Regions: [       // OcrResultRegion 数组
        {
            Rect: {...},
            Text: "识别的文字",
            Score: 0.95
        },
        // ... 更多区域
    ],
    Text: string     // 自动排序合并的完整文本
}
```

**文本合并规则**: 按Y坐标排序，再按X坐标排序，用换行符连接

**代码位置**: `OcrResult.cs:39-68`

---

## 使用方式

### 通过RecognitionObject进行OCR识别

```javascript
// 截取游戏画面
const gameImage = captureGameRegion();

// ✅ 正确方法：创建OCR识别对象
const ocrRo = RecognitionObject.Ocr(0, 0, gameImage.Width, gameImage.Height);

// 对整个画面进行OCR识别
const ocrResult = gameImage.Find(ocrRo);
if (!ocrResult.IsEmpty()) {
    console.log('识别结果:', ocrResult.Text);
} else {
    console.log('未识别到文字');
}

// 查看所有识别区域
ocrResult.Regions.forEach((region, index) => {
    console.log(`区域${index}: "${region.Text}" (置信度: ${region.Score})`);
    console.log(`位置: (${region.Rect.Center.X}, ${region.Rect.Center.Y})`);
});
```

### 指定区域OCR识别

```javascript
// 截取特定区域进行OCR
const gameImage = captureGameRegion();

// 创建感兴趣区域（ROI）
const roi = gameImage.crop(100, 50, 200, 100); // x, y, width, height

// 对指定区域进行OCR
const textResult = roi.ocr();
console.log('区域文字:', textResult.Text);
```

### 条件过滤OCR结果

```javascript
// 获取OCR结果
const ocrResult = captureGameRegion().ocr();

// 过滤高置信度的结果
const highConfidenceRegions = ocrResult.Regions.filter(region => region.Score > 0.8);

// 查找包含特定文字的区域
const targetRegions = ocrResult.Regions.filter(region => 
    region.Text.includes('冒险家协会')
);

if (targetRegions.length > 0) {
    const target = targetRegions[0];
    console.log(`找到目标: "${target.Text}" 位置: (${target.Rect.Center.X}, ${target.Rect.Center.Y})`);
    
    // 点击识别到的文字位置
    click(target.Rect.Center.X, target.Rect.Center.Y);
}
```

---

## 实用功能示例

### 自动识别UI文字并点击

```javascript
async function clickUIText(targetText) {
    const gameImage = captureGameRegion();
    
    // ✅ 正确方法：使用RecognitionObject + FindMulti
    const ocrRo = RecognitionObject.Ocr(0, 0, gameImage.Width, gameImage.Height);
    const ocrResults = gameImage.FindMulti(ocrRo);
    
    // 查找目标文字
    for (let i = 0; i < ocrResults.length; i++) {
        const region = ocrResults[i];
        if (region.Text.includes(targetText)) {
            console.log(`找到文字: "${region.Text}"`);
            region.Click(); // 直接点击识别到的区域
            return true;
        }
    }
    
    console.log(`未找到文字: "${targetText}"`);
    return false;
}

// 使用示例
if (await clickUIText('确认')) {
    console.log('成功点击确认按钮');
}
```

### 读取游戏内数值信息

```javascript
function readGameStats() {
    const gameImage = captureGameRegion();
    
    // 识别特定区域的数字信息（如血量、经验等）
    const statsArea = gameImage.crop(50, 50, 300, 100);
    const ocrResult = statsArea.ocr();
    
    // 提取数字信息
    const numbers = [];
    ocrResult.Regions.forEach(region => {
        const matches = region.Text.match(/\d+/g);
        if (matches) {
            numbers.push(...matches.map(Number));
        }
    });
    
    console.log('识别到的数字:', numbers);
    return numbers;
}
```

### 检测对话框内容

```javascript
async function readDialogContent() {
    const gameImage = captureGameRegion();
    
    // 假设对话框在屏幕下方
    const dialogArea = gameImage.crop(0, gameImage.Height * 0.7, gameImage.Width, gameImage.Height * 0.3);
    
    const ocrResult = dialogArea.ocr();
    
    if (ocrResult.Text.trim()) {
        console.log('对话内容:', ocrResult.Text);
        
        // 检查是否有选择选项
        const options = ocrResult.Regions.filter(region => 
            region.Text.startsWith('1.') || 
            region.Text.startsWith('2.') || 
            region.Text.includes('选择')
        );
        
        if (options.length > 0) {
            console.log('发现对话选项:');
            options.forEach(option => {
                console.log(`- ${option.Text}`);
            });
        }
        
        return ocrResult.Text;
    }
    
    return null;
}
```

### 物品数量识别

```javascript
function readItemCount(itemName) {
    const gameImage = captureGameRegion();
    
    // ✅ 正确方法：使用RecognitionObject + FindMulti
    const ocrRo = RecognitionObject.Ocr(0, 0, gameImage.Width, gameImage.Height);
    const ocrResults = gameImage.FindMulti(ocrRo);
    
    // 查找物品名称附近的数字
    let itemRegion = null;
    for (let i = 0; i < ocrResults.length; i++) {
        if (ocrResults[i].Text.includes(itemName)) {
            itemRegion = ocrResults[i];
            break;
        }
    }
    
    if (itemRegion) {
        // 在物品名称附近查找数字
        const numberRegions = [];
        for (let i = 0; i < ocrResults.length; i++) {
            const region = ocrResults[i];
            const distance = Math.sqrt(
                Math.pow(region.X - itemRegion.X, 2) + 
                Math.pow(region.Y - itemRegion.Y, 2)
            );
            if (distance < 100 && /\d+/.test(region.Text)) {
                numberRegions.push(region);
            }
        }
        
        if (numberRegions.length > 0) {
            const count = parseInt(numberRegions[0].Text.match(/\d+/)[0]);
            console.log(`${itemName} 数量: ${count}`);
            return count;
        }
    }
    
    return 0;
}

// 使用示例
const moreCount = readItemCount('摩拉');
console.log('当前摩拉数量:', moreCount);
```

---

## 最佳实践

### 1. 提高识别精度

```javascript
// 选择合适的识别区域，避免背景干扰
const cleanArea = gameImage.crop(x, y, width, height);

// 对于数字识别，可以进行图像预处理
const preprocessed = cleanArea.threshold(200); // 二值化
const ocrResult = preprocessed.ocr();
```

### 2. 处理识别错误

```javascript
function robustOCR(imageRegion, expectedTexts) {
    const ocrResult = imageRegion.ocr();
    
    // 使用简单的字符串包含匹配
    for (const expected of expectedTexts) {
        const found = ocrResult.Regions.find(region => {
            // 简化匹配：检查是否包含关键字
            return region.Text.includes(expected) || expected.includes(region.Text);
        });
        
        if (found) {
            return found;
        }
    }
    
    return null;
}
```

### 3. 缓存和优化

```javascript
// 使用时间戳缓存OCR结果（简化版）
let lastOcrResult = null;
let lastOcrTime = 0;
const OCR_CACHE_DURATION = 1000; // 1秒缓存

function getCachedOCR(imageRegion) {
    const now = Date.now();
    
    if (now - lastOcrTime < OCR_CACHE_DURATION && lastOcrResult) {
        return lastOcrResult;
    }
    
    lastOcrResult = imageRegion.ocr();
    lastOcrTime = now;
    return lastOcrResult;
}
```

---

## 注意事项

1. **性能考虑**: OCR识别相对耗时，避免频繁调用
2. **识别精度**: 文字清晰度、字体大小、背景对比度都会影响识别效果
3. **语言支持**: 主要支持中英文混合识别
4. **坐标系统**: OCR返回的坐标是相对于输入图像的，需要转换为游戏窗口坐标
5. **置信度阈值**: 建议根据实际需要设置合适的置信度阈值（通常0.7以上较可靠）

## 常见错误和解决方案

### 1. "Cannot destructure property 'X' of 'undefined'" 错误

**错误原因**: 传入OCR函数的参数为undefined、null或缺少必需属性

**解决方案**:
```javascript
// ❌ 错误的调用方式
await Utils.easyOCR(undefined);           // 导致错误
await Utils.easyOCR(null);                // 导致错误
await Utils.easyOCR({});                  // 导致错误（缺少属性）
await Utils.easyOCR({X: 100, Y: 200});    // 导致错误（缺少WIDTH/HEIGHT）

// ✅ 正确的调用方式
var region = {
    X: 100,
    Y: 200,
    WIDTH: 300,
    HEIGHT: 50
};
await Utils.easyOCR(region);
```

### 2. RecognitionObject.Ocr参数错误

**错误原因**: 传入非数字或负数参数

**解决方案**:
```javascript
// ❌ 错误的参数
RecognitionObject.Ocr("100", "200", "300", "50");  // 字符串参数
RecognitionObject.Ocr(-10, -20, 300, 50);          // 负数坐标
RecognitionObject.Ocr(100, 200, 0, 50);            // 宽度为0

// ✅ 正确的参数
RecognitionObject.Ocr(100, 200, 300, 50);          // 所有参数为正数
```

### 3. OCR区域超出屏幕范围

**错误原因**: 指定的区域超出了游戏窗口范围

**解决方案**:
```javascript
// 获取游戏窗口尺寸
var gameWidth = genshin.Width;
var gameHeight = genshin.Height;

// 确保区域在有效范围内
function validateOcrRegion(region) {
    if (region.X < 0 || region.Y < 0) {
        throw new Error("OCR区域坐标不能为负数");
    }
    if (region.X + region.WIDTH > gameWidth || region.Y + region.HEIGHT > gameHeight) {
        throw new Error("OCR区域超出游戏窗口范围");
    }
    return true;
}
```

### 4. Utils.easyOCR函数使用示例

经过修复后的Utils.easyOCR函数包含完整的参数验证：

```javascript
// 标准使用方式
var region = Constants.OCR_REGIONS.LOCATION;
var result = await Utils.easyOCR(region);

if (result.count > 0) {
    log.info("识别到文字: " + result[0].text);
} else {
    log.info("未识别到任何文字");
}

// 错误处理示例
try {
    var result = await Utils.easyOCR(someRegion);
    // 处理结果...
} catch (error) {
    log.error("OCR识别失败: " + error.message);
}
```

---

## 错误处理

```javascript
try {
    const ocrResult = gameImage.ocr();
    
    if (!ocrResult || !ocrResult.Regions || ocrResult.Regions.length === 0) {
        log.warn('OCR未识别到任何文字');
        return;
    }
    
    // 处理识别结果
    processOcrResult(ocrResult);
    
} catch (error) {
    log.error('OCR识别出错:', error.message);
}
```

---

## 版本信息

- **文档版本**: v1.1.0
- **最后更新**: 2026年1月18日
- **适用BGI版本**: >=0.52.0
- **维护状态**: 活跃维护

## 变更记录

- v1.1.0 (2026-01-18): 添加引擎注册位置引用（EngineExtend.cs:59）
- v1.0.0 (2025-10-19): 初始版本

