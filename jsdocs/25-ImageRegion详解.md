# JavaScript脚本开发 - ImageRegion图像处理完整指南

## 概述

本文档是BGI JavaScript图像处理的完整指南，整合了`captureGameRegion()`函数返回的`ImageRegion`对象、OpenCV Mat像素访问、绘图可视化功能以及相关OpenCV类型的全部内容。

**相关代码位置**:
- 全局方法: `BetterGenshinImpact\Core\Script\Dependence\GlobalMethod.cs:246-248`
- Region基类: `BetterGenshinImpact\GameTask\Model\Area\Region.cs:18-281`
- ImageRegion类: `BetterGenshinImpact\GameTask\Model\Area\ImageRegion.cs`
- OpenCV类型注入: `BetterGenshinImpact\Core\Script\EngineExtend.cs:51-63`
- RecognitionObject: `BetterGenshinImpact\Core\Recognition\RecognitionObject.cs`

---

## 第一部分：captureGameRegion()和ImageRegion对象

### 1.1 基本用法

```javascript
// 获取游戏窗口截图
const gameImage = captureGameRegion();

// 基本属性访问
log.info(`截图尺寸: ${gameImage.Width} x ${gameImage.Height}`);
log.info(`位置: (${gameImage.X}, ${gameImage.Y})`);
log.info(`区域范围: 左=${gameImage.Left} 右=${gameImage.Right} 顶=${gameImage.Top} 底=${gameImage.Bottom}`);
```

### 1.2 ImageRegion对象结构

#### 继承层级
```
ImageRegion -> Region -> IDisposable
```

#### 核心属性

**几何属性（继承自Region）**:
- `X`, `Y`: 区域左上角坐标
- `Width`, `Height`: 区域宽度和高度
- `Left`, `Right`, `Top`, `Bottom`: 边界坐标
- `Text`: OCR识别结果文本

**图像数据属性（ImageRegion特有）**:
- `SrcMat`: OpenCV Mat对象，包含原始BGR图像数据
- `CacheGreyMat`: 灰度图像缓存（延迟加载）
- `CacheImage`: RGB24格式图像缓存（延迟加载）

---

## 第二部分：Mat对象和像素访问

### 2.1 Mat基础概念

`Mat`是OpenCV的核心图像对象，代表一个多维数组，通常用于存储图像数据。

```javascript
const gameImage = captureGameRegion();
const mat = gameImage.SrcMat;  // 获取Mat对象

// Mat对象的基本属性
log.info(`图像尺寸: ${mat.Width} x ${mat.Height}`);
log.info(`图像通道数: ${mat.Channels()}`);
log.info(`图像类型: ${mat.Type()}`);
```

### 2.2 直接像素访问 ✅

BGI完全支持通过Mat对象的`Get`方法直接获取像素点的RGB值：

```javascript
const gameImage = captureGameRegion();
const mat = gameImage.SrcMat;

// 获取指定位置的像素值（注意：参数顺序是 类型, y, x）
const pixelBGR = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x);

// 提取BGR分量
const blue = pixelBGR.Item0;   // B分量 (0-255)
const green = pixelBGR.Item1;  // G分量 (0-255)
const red = pixelBGR.Item2;    // R分量 (0-255)

log.info(`位置(${x}, ${y})的颜色: R=${red}, G=${green}, B=${blue}`);
```

**⚠️ 重要注意事项**:
- 必须使用 `mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x)` 语法
- Mat的Get方法参数顺序是`(类型, y, x)`，坐标顺序是先y后x
- 类型参数必须是 `OpenCvSharp.OpenCvSharp.Vec3b`，不能简化
- 返回的是BGR格式，不是RGB格式
- Vec3b对象通过`Item0`、`Item1`、`Item2`访问B、G、R分量

### 2.3 像素访问实用函数

```javascript
// 颜色检测函数
function isColorMatch(mat, x, y, targetR, targetG, targetB, tolerance = 10) {
    const pixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x);
    const r = pixel.Item2;
    const g = pixel.Item1;
    const b = pixel.Item0;

    return Math.abs(r - targetR) <= tolerance &&
           Math.abs(g - targetG) <= tolerance &&
           Math.abs(b - targetB) <= tolerance;
}

// 区域颜色分析
function analyzeRegionColor(mat, x, y, width, height, sampleStep = 5) {
    const colors = [];

    for (let py = y; py < y + height; py += sampleStep) {
        for (let px = x; px < x + width; px += sampleStep) {
            if (px < mat.Width && py < mat.Height) {
                const pixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, py, px);
                colors.push({
                    r: pixel.Item2,
                    g: pixel.Item1,
                    b: pixel.Item0
                });
            }
        }
    }

    // 计算平均颜色
    if (colors.length > 0) {
        const avg = colors.reduce((acc, c) => ({
            r: acc.r + c.r,
            g: acc.g + c.g,
            b: acc.b + c.b
        }), {r: 0, g: 0, b: 0});

        return {
            avgR: Math.round(avg.r / colors.length),
            avgG: Math.round(avg.g / colors.length),
            avgB: Math.round(avg.b / colors.length),
            sampleCount: colors.length
        };
    }

    return null;
}
```

---

## 第三部分：图像识别功能

### 3.1 Find方法 - 单目标识别

```javascript
const gameImage = captureGameRegion();

// 模板匹配识别
const buttonTemplate = RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/button.png"),
    100, 100, 200, 50  // 搜索区域
);

const result = gameImage.Find(buttonTemplate);
if (!result.IsEmpty()) {
    log.info(`找到按钮位置: (${result.X}, ${result.Y})`);
    result.Click(); // 点击找到的按钮
}

// OCR文字识别
const textRegion = RecognitionObject.Ocr(50, 200, 300, 40);
const ocrResult = gameImage.Find(textRegion);
if (!ocrResult.IsEmpty()) {
    log.info(`识别到文字: ${ocrResult.Text}`);
}
```

### 3.2 FindMulti方法 - 多目标识别

```javascript
const gameImage = captureGameRegion();

// 查找所有相同的图标
const iconTemplate = RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/icon.png"),
    0, 0, gameImage.Width, gameImage.Height
);

const results = gameImage.FindMulti(iconTemplate);
log.info(`找到 ${results.length} 个图标`);

results.forEach((result, index) => {
    log.info(`图标${index + 1}: (${result.X}, ${result.Y})`);
    result.Click();
    sleep(500);
});
```

---

## 第四部分：区域裁剪和操作

### 4.1 DeriveCrop - 图像裁剪

```javascript
const gameImage = captureGameRegion();

// 裁剪出特定区域的子图像
const uiRegion = gameImage.DeriveCrop(100, 50, 400, 300);

// ⚠️ 重要：在裁剪区域内识别时，坐标系从0,0开始
const buttonTemplate = RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/button.png"),
    0, 0, uiRegion.Width, uiRegion.Height  // 使用裁剪区域的尺寸
);

const buttonInUI = uiRegion.Find(buttonTemplate);
if (!buttonInUI.IsEmpty()) {
    buttonInUI.Click();
}
```

### 4.2 Derive - 区域派生

```javascript
const gameImage = captureGameRegion();

// 派生点区域
const clickPoint = gameImage.Derive(200, 150);
clickPoint.Click();

// 派生矩形区域
const buttonArea = gameImage.Derive(100, 50, 200, 40);
buttonArea.Click(); // 点击矩形中心
```

---

## 第五部分：绘图和可视化功能

### 5.1 基础矩形绘制 ✅

```javascript
const region = captureGameRegion();

// 绘制基础矩形（使用默认红色画笔，线宽2）
region.DrawRect(100, 50, 200, 150, "myRect");

// 绘制多个矩形
region.DrawRect(100, 250, 150, 100, "rect1");
region.DrawRect(300, 250, 150, 100, "rect2");
```

**参数说明**:
- `x, y` (number): 矩形左上角坐标
- `w, h` (number): 矩形宽度和高度
- `name` (string): 绘制对象的唯一标识名称

### 5.2 基础线条绘制 ✅

```javascript
// 绘制基础线条（使用默认红色画笔，线宽2）
region.DrawLine(100, 100, 300, 200, "myLine");

// 绘制多条线条
region.DrawLine(150, 400, 250, 500, "line1");
region.DrawLine(300, 400, 400, 500, "line2");
```

**参数说明**:
- `x1, y1` (number): 线条起点坐标
- `x2, y2` (number): 线条终点坐标
- `name` (string): 绘制对象的唯一标识名称

### 5.3 区域边框绘制 ✅

```javascript
// 绘制整个游戏区域的边框
const region = captureGameRegion();
region.DrawSelf("regionBorder");
```

### 5.4 "清除"功能的变通实现 🔧

虽然无法直接访问VisionContext的清除方法，但可以通过**零大小图形覆盖法**实现变通清除：

```javascript
// 清除矩形的变通方法
region.DrawRect(0, 0, 0, 0, "要清除的矩形name");

// 清除线条的变通方法
region.DrawLine(0, 0, 0, 0, "要清除的线条name");

// 实际应用示例
region.DrawRect(100, 100, 200, 150, "testRect");  // 绘制矩形
await sleep(2000);
region.DrawRect(0, 0, 0, 0, "testRect");          // "清除"矩形
```

**工作原理**:
- 使用相同的name绘制零大小的图形
- BGI会用新的零大小图形替换原有图形
- 由于零大小图形不可见，达到"清除"效果

### 5.5 动态绘图管理器

```javascript
const DrawingManager = {
    visible: {},

    showRect: function(name, x, y, w, h) {
        const region = captureGameRegion();
        region.DrawRect(x, y, w, h, name);
        this.visible[name] = true;
    },

    hideRect: function(name) {
        const region = captureGameRegion();
        region.DrawRect(0, 0, 0, 0, name);
        this.visible[name] = false;
    },

    toggle: function(name, type, ...params) {
        if (this.visible[name]) {
            this.hideRect(name);
        } else {
            this.showRect(name, ...params);
        }
    }
};
```

### 5.6 绘图功能限制 ❌

**确认不支持的功能**:
- ❌ 自定义颜色和线宽（System.Drawing.Pen不可访问）
- ❌ VisionContext直接清除（VisionContext.Instance()不可访问）
- ❌ Math.cos/sin等数学函数（反射限制）
- ❌ 复杂图形绘制（受Math函数限制）

---

## 第六部分：OpenCV和其他类型

### 6.1 注入到JavaScript的类型

```javascript
// 以下类型在脚本启动时自动可用，无需手动导入

// OpenCV核心类型
Mat                  // 图像矩阵对象
Point2f              // 2D浮点坐标

// 区域类型
Region               // 基础区域类
DesktopRegion        // 桌面区域
GameCaptureRegion    // 游戏捕获区域
ImageRegion          // 图像区域

// 识别类型
RecognitionObject    // 识别对象创建器

// 战斗系统类型
CombatScenes         // 战斗场景
Avatar               // 角色信息

// OpenCvSharp命名空间
OpenCvSharp          // OpenCV .NET绑定
```

### 6.2 Point2f - 2D浮点坐标

```javascript
// 创建Point2f对象
const point = new Point2f(100.5, 200.3);

// 访问坐标
log.info(`坐标: (${point.X}, ${point.Y})`);

// 距离计算
function calculateDistance(point1, point2) {
    const dx = point2.X - point1.X;
    const dy = point2.Y - point1.Y;
    return Math.sqrt(dx * dx + dy * dy);
}

// 在游戏API中的使用
const currentPos = genshin.getPositionFromMap();
log.info(`当前位置: (${currentPos.X}, ${currentPos.Y})`);
```

### 6.3 RecognitionObject - 识别对象创建器

```javascript
// 创建模板匹配识别对象
const templateRo = RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/template.png"),
    100, 200, 300, 150  // 搜索区域
);

// 创建OCR识别对象
const ocrRo = RecognitionObject.Ocr(
    50, 100, 400, 80  // OCR区域
);

// 执行识别
const gameImage = captureGameRegion();
const result = gameImage.Find(templateRo);
```

---

## 第七部分：综合应用示例

### 7.1 复合识别流程

```javascript
async function smartButtonClick() {
    const gameImage = captureGameRegion();

    // 首先尝试模板匹配
    const templateResult = gameImage.Find(buttonTemplate);
    if (!templateResult.IsEmpty()) {
        log.info("模板匹配成功");
        templateResult.Click();
        return true;
    }

    // 模板匹配失败，尝试颜色匹配
    const buttonColor = {r: 255, g: 165, b: 0};
    for (let y = 0; y < gameImage.Height; y += 10) {
        for (let x = 0; x < gameImage.Width; x += 10) {
            if (isColorMatch(gameImage.SrcMat, x, y, buttonColor.r, buttonColor.g, buttonColor.b, 20)) {
                log.info(`通过颜色找到按钮: (${x}, ${y})`);
                gameImage.ClickTo(x, y);
                return true;
            }
        }
    }

    // 最后尝试OCR识别
    const ocrResults = gameImage.FindMulti(RecognitionObject.Ocr(0, 0, gameImage.Width, gameImage.Height));
    for (const result of ocrResults) {
        if (result.Text.includes("确认") || result.Text.includes("确定")) {
            log.info("通过OCR找到确认按钮");
            result.Click();
            return true;
        }
    }

    log.info("未找到可点击的按钮");
    return false;
}
```

### 7.2 区域监控和变化检测

```javascript
class RegionMonitor {
    constructor(x, y, width, height) {
        this.region = {x, y, width, height};
        this.lastHash = null;
    }

    calculateRegionHash(mat, region) {
        let hash = 0;
        const step = 10;

        for (let y = region.y; y < region.y + region.height; y += step) {
            for (let x = region.x; x < region.x + region.width; x += step) {
                if (x < mat.Width && y < mat.Height) {
                    const pixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x);
                    hash += pixel.Item0 + pixel.Item1 + pixel.Item2;
                }
            }
        }

        return hash;
    }

    hasChanged() {
        const gameImage = captureGameRegion();
        const currentHash = this.calculateRegionHash(gameImage.SrcMat, this.region);

        if (this.lastHash === null) {
            this.lastHash = currentHash;
            return false;
        }

        const changed = Math.abs(currentHash - this.lastHash) > 1000;
        this.lastHash = currentHash;
        return changed;
    }
}

// 使用示例
const uiMonitor = new RegionMonitor(100, 50, 400, 300);
if (uiMonitor.hasChanged()) {
    log.info("UI区域发生变化");
}
```

### 7.3 智能UI检测系统

```javascript
class SmartUIDetector {
    constructor() {
        this.templates = new Map();
        this.loadTemplates();
    }

    loadTemplates() {
        const uiElements = [
            { id: "menu", path: "assets/menu.png", area: [0, 0, 100, 100] },
            { id: "inventory", path: "assets/inventory.png", area: [50, 50, 200, 150] }
        ];

        for (const element of uiElements) {
            const ro = RecognitionObject.TemplateMatch(
                file.readImageMatSync(element.path),
                ...element.area
            );
            this.templates.set(element.id, ro);
        }
    }

    async detectCurrentUI() {
        const gameImage = captureGameRegion();
        const detectedElements = [];

        for (const [id, ro] of this.templates) {
            const result = gameImage.Find(ro);
            if (!result.IsEmpty()) {
                detectedElements.push({
                    id: id,
                    position: new Point2f(result.X, result.Y),
                    region: result
                });
            }
        }

        return detectedElements;
    }

    async waitForUI(elementId, timeout = 5000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const elements = await this.detectCurrentUI();
            const target = elements.find(e => e.id === elementId);

            if (target) return target;

            await sleep(200);
        }

        throw new Error(`UI元素 ${elementId} 在 ${timeout}ms 内未找到`);
    }
}
```

---

## 第八部分：性能优化和最佳实践

### 8.1 资源管理 ⚠️

```javascript
// ✅ 正确：及时释放资源
function processImage() {
    const gameImage = captureGameRegion();
    try {
        const result = gameImage.Find(template);
        return result;
    } finally {
        gameImage.Dispose(); // 释放图像资源
    }
}

// ❌ 错误：不释放资源会导致内存泄漏
function badProcessImage() {
    const gameImage = captureGameRegion();
    const result = gameImage.Find(template);
    return result; // gameImage没有被释放
}
```

### 8.2 区域限制优化

```javascript
// ✅ 正确：限制搜索区域提高性能
const specificAreaTemplate = RecognitionObject.TemplateMatch(
    template,
    knownX, knownY, limitedWidth, limitedHeight
);

// ❌ 效率低：全屏搜索
const fullScreenTemplate = RecognitionObject.TemplateMatch(
    template,
    0, 0, gameImage.Width, gameImage.Height
);
```

### 8.3 坐标系统注意事项

```javascript
// ⚠️ 重要：Mat.Get()的参数顺序是(类型, y, x)
function correctPixelAccess(mat, screenX, screenY) {
    // ✅ 正确：类型，y在前，x在后
    const pixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, screenY, screenX);

    // ❌ 错误：x在前，y在后
    // const pixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, screenX, screenY);

    return {
        r: pixel.Item2,
        g: pixel.Item1,
        b: pixel.Item0
    };
}
```

---

## 第九部分：常见问题和解决方案

### 9.1 坐标系统混淆

```javascript
// ❌ 常见错误：坐标顺序错误
const wrongPixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, x, y);

// ✅ 正确做法
const correctPixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x);
```

### 9.2 颜色格式混淆

```javascript
// ❌ 常见错误：以为是RGB格式
const wrongRed = pixel.Item0;   // Item0是B分量
const wrongBlue = pixel.Item2;  // Item2是R分量

// ✅ 正确做法：BGR格式
const blue = pixel.Item0;   // B分量
const green = pixel.Item1;  // G分量
const red = pixel.Item2;    // R分量
```

### 9.3 裁剪后模板匹配问题

```javascript
// ❌ 常见错误：使用原始游戏坐标
const gameImage = captureGameRegion();
const croppedRegion = gameImage.DeriveCrop(100, 50, 400, 300);
const wrongTemplate = RecognitionObject.TemplateMatch(
    templateMat,
    100, 50, 400, 300  // 错误：这是原始坐标
);

// ✅ 正确做法：使用裁剪区域坐标系
const correctTemplate = RecognitionObject.TemplateMatch(
    templateMat,
    0, 0, croppedRegion.Width, croppedRegion.Height  // 正确：从0开始
);
```

---

## 总结

### 功能分类总结

#### ✅ 完全支持的功能
1. **像素访问**: `mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x)` - 直接获取BGR像素值
2. **图像识别**: `Find()` 和 `FindMulti()` - 模板匹配和OCR
3. **区域操作**: `DeriveCrop()` 和 `Derive()` - 裁剪和派生
4. **绘图功能**: `DrawRect()`, `DrawLine()`, `DrawSelf()` - 基础绘图
5. **鼠标操作**: `Click()`, `ClickTo()`, `Move()` - 鼠标控制

#### 🔧 变通可用的功能
1. **"清除"图形**: 通过零大小图形覆盖实现

#### ❌ 不支持的功能
1. 自定义颜色和线宽
2. VisionContext直接清除
3. Math三角函数
4. 复杂图形绘制

### 重要注意事项

1. **坐标顺序**: Mat.Get()参数是(Vec3b, y, x)，不是(x, y)
2. **颜色格式**: BGR格式，不是RGB格式
3. **资源管理**: 必须调用Dispose()释放ImageRegion资源
4. **裁剪坐标系**: 裁剪后的区域坐标从(0,0)开始
5. **模板尺寸**: 确保模板不超过搜索区域大小

### 推荐使用策略

- **精确颜色检测**: 优先使用Mat.Get()直接像素访问
- **UI元素识别**: 使用RecognitionObject模板匹配
- **文字识别**: 使用RecognitionObject.Ocr()
- **调试辅助**: 使用DrawRect/DrawLine标记关键区域
- **性能优化**: 限制搜索区域范围，及时释放资源

---

## 版本信息

- **文档版本**: v1.0.0
- **最后更新**: 2026年1月20日
- **适用BGI版本**: >=0.52.0
- **维护状态**: 活跃维护
- **整合来源**: 合并了11、12、15、19号文档

## 变更记录

- v1.0.0 (2026-01-20): 整合4个ImageRegion相关文档创建完整指南
  - 合并11-像素访问和颜色检测功能.md
  - 合并12-绘图和可视化功能.md
  - 合并15-captureGameRegion返回值详解与用法.md
  - 合并19-OpenCV和图像处理类型.md
  - 去除重复内容，优化章节结构
  - 保留所有关键技术细节和示例代码
