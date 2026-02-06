# JavaScript脚本开发 - captureGameRegion返回值详解与用法

## 概述

`captureGameRegion()`是BGI JavaScript脚本开发中的核心函数，用于获取当前游戏窗口的截图。它返回一个`ImageRegion`对象，该对象继承自`Region`类，提供了丰富的图像识别、像素访问、区域操作等功能。

**相关代码位置**: 
- `BetterGenshinImpact\Core\Script\Dependence\GlobalMethod.cs:246-248`
- `BetterGenshinImpact\GameTask\Model\Area\ImageRegion.cs`
- `BetterGenshinImpact\GameTask\Model\Area\Region.cs`

---

## 基本用法

```javascript
// 获取游戏窗口截图
const gameImage = captureGameRegion();

// 基本属性访问
console.log(`截图尺寸: ${gameImage.Width} x ${gameImage.Height}`);
console.log(`位置: (${gameImage.X}, ${gameImage.Y})`);
console.log(`区域范围: 左=${gameImage.Left} 右=${gameImage.Right} 顶=${gameImage.Top} 底=${gameImage.Bottom}`);
```

---

## ImageRegion对象结构

### 继承层级
```
ImageRegion -> Region -> IDisposable
```

### 构造函数

**ImageRegion(Mat mat, int x, int y, Region? owner, INodeConverter? converter, DrawContent? drawContent)**

- **描述**：使用 Mat 矩阵创建新的图像区域

- **参数**：
  - `mat`（Mat）：OpenCV Mat 矩阵
  - `x`（int）：X 坐标
  - `y`（int）：Y 坐标
  - `owner`（Region?）：所属区域
  - `converter`（INodeConverter?）：节点转换器
  - `drawContent`（DrawContent?）：绘制内容

### 核心属性

#### 几何属性（继承自Region）
- `X`, `Y`: 区域左上角坐标
- `Width`, `Height`: 区域宽度和高度
- `Left`, `Right`, `Top`, `Bottom`: 边界坐标
- `Text`: OCR识别结果文本

#### 图像数据属性（ImageRegion特有）
- `SrcMat`: OpenCV Mat对象，包含原始BGR图像数据
- `CacheGreyMat`: 灰度图像缓存（延迟加载）
- `CacheImage`: RGB24格式图像缓存（延迟加载）

---

## 核心功能详解

### 1. 像素访问功能

#### 直接像素访问
```javascript
const gameImage = captureGameRegion();
const mat = gameImage.SrcMat;  // 获取OpenCV Mat对象

// 获取指定位置的像素值（注意：参数顺序是 y, x）
const pixelBGR = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x);  // 返回Vec3b对象

// 提取BGR分量
const blue = pixelBGR.Item0;   // B分量 (0-255)
const green = pixelBGR.Item1;  // G分量 (0-255) 
const red = pixelBGR.Item2;    // R分量 (0-255)

console.log(`位置(${x}, ${y})的颜色: R=${red}, G=${green}, B=${blue}`);
```

#### 颜色匹配实用函数
```javascript
// 检测特定颜色（带容差）
function isColorMatch(mat, x, y, targetR, targetG, targetB, tolerance = 10) {
  const pixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x);
  const r = pixel.Item2;  // 注意BGR顺序
  const g = pixel.Item1; 
  const b = pixel.Item0;
  
  return Math.abs(r - targetR) <= tolerance && 
         Math.abs(g - targetG) <= tolerance && 
         Math.abs(b - targetB) <= tolerance;
}

// 使用示例：检测按钮高亮状态
const gameImage = captureGameRegion();
const isHighlighted = isColorMatch(gameImage.SrcMat, 100, 50, 255, 165, 0, 15); // 橙色按钮
```

#### 区域颜色分析
```javascript
// 分析区域内主要颜色
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
  const avgColor = colors.reduce((acc, color) => ({
    r: acc.r + color.r,
    g: acc.g + color.g,
    b: acc.b + color.b
  }), {r: 0, g: 0, b: 0});
  
  avgColor.r = Math.round(avgColor.r / colors.length);
  avgColor.g = Math.round(avgColor.g / colors.length);
  avgColor.b = Math.round(avgColor.b / colors.length);
  
  return avgColor;
}
```

### 2. 图像识别功能

#### Find方法 - 单目标识别
```javascript
const gameImage = captureGameRegion();

// 模板匹配识别
const buttonTemplate = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/button.png"),
  100, 100, 200, 50  // 搜索区域
);

const result = gameImage.Find(buttonTemplate);
if (!result.IsEmpty()) {
  console.log(`找到按钮位置: (${result.X}, ${result.Y})`);
  result.Click(); // 点击找到的按钮
}

// OCR文字识别
const textRegion = RecognitionObject.Ocr(50, 200, 300, 40);
const ocrResult = gameImage.Find(textRegion);
if (!ocrResult.IsEmpty()) {
  console.log(`识别到文字: ${ocrResult.Text}`);
}
```

#### FindMulti方法 - 多目标识别
```javascript
const gameImage = captureGameRegion();

// 查找所有相同的图标
const iconTemplate = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/icon.png"),
  0, 0, gameImage.Width, gameImage.Height
);

const results = gameImage.FindMulti(iconTemplate);
console.log(`找到 ${results.length} 个图标`);

results.forEach((result, index) => {
  console.log(`图标${index + 1}: (${result.X}, ${result.Y})`);
  // 可以对每个结果进行操作
  result.Click();
  sleep(500);
});

// OCR识别多个文本区域
const ocrTemplate = RecognitionObject.Ocr(0, 0, gameImage.Width, gameImage.Height);
const textResults = gameImage.FindMulti(ocrTemplate);
textResults.forEach(result => {
  console.log(`文字: "${result.Text}" 位置: (${result.X}, ${result.Y})`);
});
```

### 3. 区域裁剪和派生

#### DeriveCrop - 图像裁剪
```javascript
const gameImage = captureGameRegion();

// 裁剪出特定区域的子图像
const uiRegion = gameImage.DeriveCrop(100, 50, 400, 300);

// 在裁剪区域内继续识别（重要：坐标系从0,0开始）
const buttonTemplate = RecognitionObject.TemplateMatch(
  file.ReadImageMatSync("assets/button.png"),
  0, 0, uiRegion.Width, uiRegion.Height  // 使用裁剪区域的尺寸，从0开始
);

const buttonInUI = uiRegion.Find(buttonTemplate);
if (!buttonInUI.IsEmpty()) {
  buttonInUI.Click(); // 点击相对于裁剪区域的按钮
}

// 双精度裁剪
const preciseRegion = gameImage.DeriveCrop(100.5, 50.3, 400.7, 300.2);

// 使用OpenCV Rect裁剪
const rect = new Rect(100, 50, 400, 300);
const rectRegion = gameImage.DeriveCrop(rect);
```

#### Derive - 区域派生
```javascript
const gameImage = captureGameRegion();

// 派生点区域
const clickPoint = gameImage.Derive(200, 150);
clickPoint.Click(); // 点击指定位置

// 派生矩形区域
const buttonArea = gameImage.Derive(100, 50, 200, 40);
buttonArea.Click(); // 点击矩形中心

// 从识别结果派生
const foundButton = gameImage.Find(buttonTemplate);
if (!foundButton.IsEmpty()) {
  // 派生按钮周围的区域
  const aroundButton = foundButton.Derive(-50, -20, foundButton.Width + 100, foundButton.Height + 40);
  aroundButton.DrawSelf("周围区域"); // 在调试窗口显示
}
```

### 4. 鼠标操作功能

#### 点击操作
```javascript
const gameImage = captureGameRegion();

// 直接点击截图中心
gameImage.Click();

// 点击指定位置
gameImage.ClickTo(300, 200);

// 双精度坐标点击
gameImage.ClickTo(300.5, 200.3);

// 点击指定矩形区域的中心
gameImage.ClickTo(100, 50, 200, 40);

// 双击操作
gameImage.DoubleClick();

// 后台点击（不移动实际鼠标）
gameImage.BackgroundClick();
```

#### 鼠标移动
```javascript
// 移动到截图中心
gameImage.Move();

// 移动到指定位置
gameImage.MoveTo(400, 300);

// 移动到矩形区域中心
gameImage.MoveTo(100, 50, 200, 40);
```

### 5. 绘制和调试功能

#### 绘制区域标记
```javascript
const gameImage = captureGameRegion();

// 绘制整个截图边框
gameImage.DrawSelf("游戏窗口", new Pen(Color.Red, 2));

// 绘制指定区域
gameImage.DrawRect(100, 50, 200, 40, "按钮区域", new Pen(Color.Blue, 1));

// 绘制多个区域
const results = gameImage.FindMulti(iconTemplate);
results.forEach((result, index) => {
  result.DrawSelf(`图标${index}`, new Pen(Color.Green, 1));
});

// 绘制线段
gameImage.DrawLine(0, 0, gameImage.Width, gameImage.Height, "对角线", new Pen(Color.Yellow, 1));
```

#### 坐标转换
```javascript
const gameImage = captureGameRegion();

// 转换到游戏窗口坐标系
const gameCoords = gameImage.ConvertPositionToGameCaptureRegion(100, 50);
console.log(`游戏坐标: (${gameCoords.Item1}, ${gameCoords.Item2})`);

// 转换到桌面坐标系
const desktopCoords = gameImage.ConvertPositionToDesktopRegion(100, 50);
console.log(`桌面坐标: (${desktopCoords.Item1}, ${desktopCoords.Item2})`);

// 转换整个区域
const gameRect = gameImage.ConvertSelfPositionToGameCaptureRegion();
```

---

## 高级用法示例

### 1. 复合识别流程
```javascript
async function smartButtonClick() {
  const gameImage = captureGameRegion();
  
  // 首先尝试模板匹配
  const templateResult = gameImage.Find(buttonTemplate);
  if (!templateResult.IsEmpty()) {
    console.log("模板匹配成功");
    templateResult.Click();
    return true;
  }
  
  // 模板匹配失败，尝试颜色匹配
  const buttonColor = {r: 255, g: 165, b: 0}; // 橙色按钮
  for (let y = 0; y < gameImage.Height; y += 10) {
    for (let x = 0; x < gameImage.Width; x += 10) {
      if (isColorMatch(gameImage.SrcMat, x, y, buttonColor.r, buttonColor.g, buttonColor.b, 20)) {
        console.log(`通过颜色找到按钮: (${x}, ${y})`);
        gameImage.ClickTo(x, y);
        return true;
      }
    }
  }
  
  // 最后尝试OCR识别
  const ocrResults = gameImage.FindMulti(RecognitionObject.Ocr(0, 0, gameImage.Width, gameImage.Height));
  for (const result of ocrResults) {
    if (result.Text.includes("确认") || result.Text.includes("确定")) {
      console.log("通过OCR找到确认按钮");
      result.Click();
      return true;
    }
  }
  
  console.log("未找到可点击的按钮");
  return false;
}
```

### 2. 区域监控和变化检测
```javascript
class RegionMonitor {
  constructor(x, y, width, height) {
    this.region = {x, y, width, height};
    this.lastHash = null;
  }
  
  // 简单的像素哈希
  calculateRegionHash(mat, region) {
    let hash = 0;
    const step = 10; // 采样步长
    
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
    
    const changed = Math.abs(currentHash - this.lastHash) > 1000; // 阈值
    this.lastHash = currentHash;
    return changed;
  }
}

// 使用示例：监控UI区域变化
const uiMonitor = new RegionMonitor(100, 50, 400, 300);
setInterval(() => {
  if (uiMonitor.hasChanged()) {
    console.log("UI区域发生变化");
    // 执行相应操作
  }
}, 1000);
```

### 3. 批量区域处理
```javascript
function processBatchRegions() {
  const gameImage = captureGameRegion();
  
  // 定义多个感兴趣区域
  const regions = [
    {name: "按钮区域", x: 100, y: 50, w: 200, h: 40},
    {name: "文字区域", x: 50, y: 200, w: 300, h: 50},
    {name: "状态区域", x: 800, y: 100, w: 150, h: 30},
    {name: "血条区域", x: 200, y: 900, w: 400, h: 20}
  ];
  
  const results = {};
  
  regions.forEach(region => {
    // 裁剪各个区域
    const subImage = gameImage.DeriveCrop(region.x, region.y, region.w, region.h);
    
    // 对每个区域进行OCR识别
    const ocrResult = subImage.Find(RecognitionObject.Ocr(0, 0, region.w, region.h));
    
    results[region.name] = {
      text: ocrResult.Text || "",
      hasContent: !ocrResult.IsEmpty(),
      region: region
    };
    
    // 在调试窗口标记区域
    subImage.DrawSelf(region.name);
  });
  
  return results;
}
```

---

## 性能优化建议

### 1. 资源管理
```javascript
// ✅ 正确：及时释放资源
function processImage() {
  const gameImage = captureGameRegion();
  try {
    const result = gameImage.Find(template);
    // 处理结果
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

### 2. 区域限制优化
```javascript
// ✅ 正确：限制搜索区域提高性能
const specificAreaTemplate = RecognitionObject.TemplateMatch(
  template,
  knownX, knownY, limitedWidth, limitedHeight // 限制搜索范围
);

// ❌ 效率低：全屏搜索
const fullScreenTemplate = RecognitionObject.TemplateMatch(
  template,
  0, 0, gameImage.Width, gameImage.Height // 全屏搜索，性能差
);
```

### 3. 缓存机制
```javascript
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 5000; // 5秒缓存
  }
  
  getGameImage() {
    const now = Date.now();
    const cached = this.cache.get('gameImage');
    
    if (cached && (now - cached.timestamp) < this.maxAge) {
      return cached.image;
    }
    
    const newImage = captureGameRegion();
    this.cache.set('gameImage', {
      image: newImage,
      timestamp: now
    });
    
    // 清理旧缓存
    if (cached) {
      cached.image.Dispose();
    }
    
    return newImage;
  }
}
```

---

## 常见问题和解决方案

### 1. 坐标系统混淆
```javascript
// ❌ 常见错误：坐标顺序错误
const wrongPixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, x, y); // 错误：应该是 (y, x)

// ✅ 正确做法
const correctPixel = mat.Get(OpenCvSharp.OpenCvSharp.Vec3b, y, x); // 正确：Mat.Get参数是 (类型, 行, 列)
```

### 2. 颜色格式混淆
```javascript
// ❌ 常见错误：以为是RGB格式
const wrongRed = pixel.Item0;   // 错误：Item0是B分量
const wrongBlue = pixel.Item2;  // 错误：Item2是R分量

// ✅ 正确做法：BGR格式
const blue = pixel.Item0;   // B分量
const green = pixel.Item1;  // G分量  
const red = pixel.Item2;    // R分量
```

### 3. 裁剪后模板匹配问题

裁剪后的区域具有独立的坐标系统，从(0,0)开始，需要正确设置模板匹配参数：

```javascript
// ❌ 常见错误：使用原始游戏坐标
const gameImage = captureGameRegion();
const croppedRegion = gameImage.DeriveCrop(100, 50, 400, 300);

const wrongTemplate = RecognitionObject.TemplateMatch(
  templateMat,
  100, 50, 400, 300  // 错误：这是原始坐标，在裁剪区域中无效
);

// ✅ 正确做法：使用裁剪区域坐标系
const correctTemplate = RecognitionObject.TemplateMatch(
  templateMat,
  0, 0, croppedRegion.Width, croppedRegion.Height  // 正确：裁剪区域坐标从0开始
);

const result = croppedRegion.Find(correctTemplate);
```

#### 裁剪匹配调试方法

```javascript
function debugCroppedMatching() {
  const gameImage = captureGameRegion();
  const croppedRegion = gameImage.DeriveCrop(100, 50, 400, 300);
  
  // 显示裁剪区域
  croppedRegion.DrawSelf("裁剪区域", new Pen(Color.Red, 2));
  
  // 检查尺寸兼容性
  const templateMat = file.ReadImageMatSync("assets/template.png");
  console.log(`裁剪区域: ${croppedRegion.Width} x ${croppedRegion.Height}`);
  console.log(`模板尺寸: ${templateMat.Width} x ${templateMat.Height}`);
  
  if (templateMat.Width > croppedRegion.Width || 
      templateMat.Height > croppedRegion.Height) {
    console.log("❌ 模板尺寸大于裁剪区域，无法匹配");
    return false;
  }
  
  // 尝试匹配
  const template = RecognitionObject.TemplateMatch(
    templateMat,
    0, 0, croppedRegion.Width, croppedRegion.Height
  );
  
  const results = croppedRegion.FindMulti(template);
  console.log(`找到 ${results.length} 个匹配结果`);
  
  // 标记匹配结果
  results.forEach((result, index) => {
    result.DrawSelf(`匹配${index}`, new Pen(Color.Green, 1));
  });
  
  return results.length > 0;
}
```

#### 安全的裁剪匹配实现

```javascript
function safeCroppedMatching(x, y, width, height, templatePath) {
  let gameImage = null;
  let croppedRegion = null;
  
  try {
    gameImage = captureGameRegion();
    croppedRegion = gameImage.DeriveCrop(x, y, width, height);
    
    const templateMat = file.ReadImageMatSync(templatePath);
    
    // 检查模板尺寸
    if (templateMat.Width > croppedRegion.Width || 
        templateMat.Height > croppedRegion.Height) {
      console.log("模板尺寸超出裁剪区域范围");
      return null;
    }
    
    const template = RecognitionObject.TemplateMatch(
      templateMat,
      0, 0, croppedRegion.Width, croppedRegion.Height
    );
    
    const result = croppedRegion.Find(template);
    return result.IsEmpty() ? null : result;
    
  } catch (error) {
    console.log("裁剪匹配出错:", error.message);
    return null;
  } finally {
    // 释放资源
    if (croppedRegion) croppedRegion.Dispose();
    if (gameImage) gameImage.Dispose();
  }
}

// 使用示例
const matchResult = safeCroppedMatching(100, 50, 400, 300, "assets/button.png");
if (matchResult) {
  console.log(`找到按钮: (${matchResult.X}, ${matchResult.Y})`);
  matchResult.Click();
}
```

### 4. 识别失败处理
```javascript
function robustFind(gameImage, template, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = gameImage.Find(template);
    if (!result.IsEmpty()) {
      return result;
    }
    
    // 重试前稍等片刻
    if (i < maxRetries - 1) {
      sleep(500);
      gameImage.Dispose();
      gameImage = captureGameRegion();
    }
  }
  
  return new Region(); // 返回空区域表示失败
}
```

---

## 总结

`captureGameRegion()`返回的`ImageRegion`对象是BGI JavaScript脚本开发的核心工具，它集成了：

1. **图像数据访问**：通过SrcMat直接访问像素数据
2. **识别功能**：模板匹配、OCR、颜色识别等
3. **区域操作**：裁剪、派生、坐标转换等  
4. **交互功能**：点击、移动、绘制等
5. **调试支持**：可视化标记、坐标转换等

**重要注意事项**：
- **裁剪坐标系**：裁剪后的区域坐标从(0,0)开始，模板匹配时必须使用裁剪区域的坐标系
- **资源管理**：及时调用Dispose()释放ImageRegion资源，避免内存泄漏  
- **模板尺寸**：确保模板图片尺寸不超过搜索区域大小
- **像素访问**：Mat.Get()参数顺序是(类型,行,列)即(Vec3b,y,x)，像素格式为BGR
- **性能优化**：限制搜索区域范围，使用缓存机制减少重复截图

掌握这些功能的正确使用方法，特别是裁剪后模板匹配的坐标系统处理，可以实现强大且稳定的游戏自动化脚本。

---

## 版本信息

- **文档版本**: v1.1.0
- **最后更新**: 2026年1月18日
- **适用BGI版本**: >=0.52.0
- **维护状态**: 活跃维护

## 变更记录

- v1.1.0 (2026-01-18): 更新文档日期

