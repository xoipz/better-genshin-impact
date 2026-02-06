// ============================================
// detection.js - 懒加载优化版
// 图像资源延迟到首次使用时才加载，避免启动卡顿
// ============================================

// 定义移动状态常量 (使用 var 确保 eval 后全局可访问)
var MOVE_STATE = {
  NORMAL: "normal",
  FLY: "fly",
  CLIMB: "climb",
  SWIM: "swim",
  UNKNOWN: "unknown"
};

// 枚举定义 (使用 var 确保 eval 后全局可访问)
var ELEMENT_STATE = {
  MAINUI: 0,
  B: 1,
  C: 2,
  O: 3,
  G: 4,
  F2: 5,
  F3: 6,
  F4: 7,
  J: 8,
  MAP: 9,
  UNKNOWN: -1,
  Story: -2
};

// ============================================
// 懒加载识别对象管理器
// ============================================
var _roCache = {};

function getLazyRo(name, loader) {
  if (!_roCache[name]) {
    _roCache[name] = loader();
  }
  return _roCache[name];
}

// 识别对象定义（懒加载）
function getPaimonMenuRo() {
  return getLazyRo('paimonMenu', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/paimon_menu.png"),
    0, 0, genshin.width / 3.0, genshin.width / 5.0
  ));
}

function getSpaceRo() {
  return getLazyRo('space', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/Space.png"),
    1683, 1027, 64, 25
  ));
}

function getSwimRo() {
  return getLazyRo('swim', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/Swim.png"),
    1811, 1027, 17, 23
  ));
}

function getClimbRo() {
  return getLazyRo('climb', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/Climb.png"),
    1596, 1027, 29, 24
  ));
}

function getBRo() {
  return getLazyRo('B', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/B.png"),
    53, 26, 47, 44
  ));
}

function getCRo() {
  return getLazyRo('C', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/C.png"),
    57, 993, 38, 32
  ));
}

function getORo() {
  return getLazyRo('O', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/O.png"),
    57, 30, 41, 33
  ));
}

function getGRo() {
  return getLazyRo('G', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/G.png"),
    52, 22, 50, 54
  ));
}

function getF2Ro() {
  return getLazyRo('F2', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/F2.png"),
    160, 999, 109, 37
  ));
}

function getF3Ro() {
  return getLazyRo('F3', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/F3.png"),
    48, 19, 57, 57
  ));
}

function getF4Ro() {
  return getLazyRo('F4', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/F4.png"),
    49, 19, 56, 53
  ));
}

function getJRo() {
  return getLazyRo('J', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/J.png"),
    58, 24, 37, 40
  ));
}

function getMapRo() {
  return getLazyRo('map', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/map3.png"),
    0, 0, 1920, 1080
  ));
}

function getStoryRo() {
  return getLazyRo('story', () => RecognitionObject.TemplateMatch(
    file.readImageMatSync("assets/RecognitionObject/disabled_ui.png"),
    265, 37, 30, 22
  ));
}

// ============================================
// 识别函数
// ============================================

// 判断是否在主界面的函数
function isInMainUI() {
  let captureRegion = captureGameRegion();
  let paimonres = captureRegion.Find(getPaimonMenuRo());
  return !paimonres.isEmpty();
}

// 识别图像函数
async function recognizeImage(recognitionObject) {
  try {
    let imageResult = captureGameRegion().find(recognitionObject);
    if (imageResult && imageResult.x !== 0 && imageResult.y !== 0 && imageResult.width !== 0 && imageResult.height !== 0) {
      return { success: true, x: imageResult.x, y: imageResult.y };
    }
  } catch (error) {
    log.error(`识别图像时发生异常: ${error.message}`);
  }
  return { success: false };
}

// 检测运动状态
async function checkAbnormalState() {
  const spaceResult = await recognizeImage(getSpaceRo());
  const swimResult = await recognizeImage(getSwimRo());
  const climbResult = await recognizeImage(getClimbRo());

  if (isInMainUI()) {
    if (swimResult.success) {
      return MOVE_STATE.SWIM;
    } else if (climbResult.success) {
      return MOVE_STATE.CLIMB;
    } else if (spaceResult.success) {
      return MOVE_STATE.FLY;
    } else {
      return MOVE_STATE.NORMAL;
    }
  }
  log.info("检测状态失败");
  return MOVE_STATE.UNKNOWN;
}

// 检测界面
async function checkElementState() {
  if (!isInMainUI()) {
    const StoryResult = await recognizeImage(getStoryRo());
    if (StoryResult.success) {
      log.info("当前界面状态: 剧情界面 (Story)");
      return ELEMENT_STATE.Story;
    }

    const bResult = await recognizeImage(getBRo());
    const cResult = await recognizeImage(getCRo());
    const oResult = await recognizeImage(getORo());
    const gResult = await recognizeImage(getGRo());
    const f2Result = await recognizeImage(getF2Ro());
    const f3Result = await recognizeImage(getF3Ro());
    const f4Result = await recognizeImage(getF4Ro());
    const jResult = await recognizeImage(getJRo());
    const mapResult = await recognizeImage(getMapRo());

    if (bResult.success) {
      log.info("当前界面状态: 背包界面 (B键)");
      return ELEMENT_STATE.B;
    } else if (cResult.success) {
      log.info("当前界面状态: 角色界面 (C键)");
      return ELEMENT_STATE.C;
    } else if (oResult.success) {
      log.info("当前界面状态: 好友界面 (O键)");
      return ELEMENT_STATE.O;
    } else if (gResult.success) {
      log.info("当前界面状态: 教程界面 (G键)");
      return ELEMENT_STATE.G;
    } else if (f2Result.success) {
      log.info("当前界面状态: 联机界面 (F2键)");
      return ELEMENT_STATE.F2;
    } else if (f3Result.success) {
      log.info("当前界面状态: 祈愿界面 (F3键)");
      return ELEMENT_STATE.F3;
    } else if (f4Result.success) {
      log.info("当前界面状态: 纪行界面 (F4键)");
      return ELEMENT_STATE.F4;
    } else if (jResult.success) {
      log.info("当前界面状态: 任务界面 (J键)");
      return ELEMENT_STATE.J;
    } else if (mapResult.success) {
      log.info("当前界面状态: 地图界面 (MAP)");
      return ELEMENT_STATE.MAP;
    } else {
      log.info("当前界面状态: 未知界面 (UNKNOWN)");
      return ELEMENT_STATE.UNKNOWN;
    }
  }
  return ELEMENT_STATE.MAINUI;
}

// ============================================
// NPC 名称提取
// ============================================

async function extractNPCNameFromTask() {
  try {
    const taskRegion = { X: 75, Y: 240, WIDTH: 280, HEIGHT: 43 };
    const ocrResults = await Utils.easyOCR(taskRegion);

    if (ocrResults.count > 0) {
      for (let i = 0; i < ocrResults.count; i++) {
        const text = ocrResults[i].text;
        log.info(`任务区域识别文本: ${text}`);

        const npcName = extractNPCName(text);
        if (npcName) {
          log.info(`提取到NPC名称: ${npcName}`);
          return npcName;
        }
      }
    }

    log.warn("未能从任务描述中提取到NPC名称");
    return null;
  } catch (error) {
    log.error(`提取NPC名称时出错: ${error.message}`);
    return null;
  }
}

function extractNPCName(text) {
  if (!text) return null;

  const patterns = [
    /与(.+?)对话/,
    /与(.+?)一起/,
    /同(.+?)交谈/,
    /向(.+?)打听/,
    /向(.+?)回报/,
    /向(.+?)报告/,
    /给(.+?)听/,
    /陪同(.+?)\S+/,
    /找到(.+?)\S+/,
    /询问(.+?)\S+/,
    /拜访(.+?)\S+/,
    /寻找(.+?)\S+/,
    /告诉(.+?)\S+/,
    /带(.+?)去\S+/,
    /跟随(.+?)\S+/,
    /协助(.+?)\S+/,
    /请教(.+?)\S+/,
    /拜托(.+?)\S+/,
    /委托(.+?)\S+/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// ============================================
// OCR 工具函数
// ============================================

async function easyOCR(region) {
  try {
    const locationOcrRo = RecognitionObject.Ocr(region.X, region.Y, region.WIDTH, region.HEIGHT);
    let captureRegion = captureGameRegion();
    let OCRresults = await captureRegion.findMulti(locationOcrRo);
    return OCRresults;
  } catch (error) {
    log.error("easyOCR识别出错: {error}", error.message);
    return { count: 0 };
  }
}

if (typeof Utils === 'undefined') {
  Utils = {};
}
Utils.easyOCR = easyOCR;
