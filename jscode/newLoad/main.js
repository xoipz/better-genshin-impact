
// 1. 初始化 HTML 面板
// ----------------------------------------------------------------
const panelId = "radarPanel";
// 创建 800x400 的面板
htmlPanel.create(panelId, 600, 300);
// 加载透明背景的 HTML
// htmlPanel.loadHtmlFile(panelId, "status.html"); // 部分环境下路径解析有问题，改为直接读取内容
const htmlContent = file.readTextSync("status.html");
if (htmlContent) {
    htmlPanel.loadHtml(panelId, htmlContent);
} else {
    log.error("无法读取 status.html 文件");
}
// 设置标题
htmlPanel.setTitle(panelId, "状态雷达");

// 2. 加载依赖 (本地资源)
// ----------------------------------------------------------------
// 为了避免 const 变量被 try 块级作用域限制，必须在顶层 eval
let detectionContent = "";
let calculateContent = "";

try {
    detectionContent = file.readTextSync("detection.js");
    calculateContent = file.readTextSync("calculate.js");
} catch (e) {
    log.error("读取依赖文件失败: " + e.message);
}

// 必须将 const 替换为 var，因为 eval 中的 const 不会泄漏到外部作用域
if (detectionContent) {
    // 简单粗暴替换 top-level const
    detectionContent = detectionContent.replace(/const /g, "var ");
    try {
        eval(detectionContent);
        log.info("成功加载 detection.js");
    } catch (e) {
        log.error("执行 detection.js 失败: " + e.message);
    }
} else {
    // 防止后续报错的 Stub
    if (typeof ELEMENT_STATE === 'undefined') {
        var ELEMENT_STATE = { UNKNOWN: "依赖加载失败" };
    }
}

if (calculateContent) {
    calculateContent = calculateContent.replace(/const /g, "var ");
    try {
        eval(calculateContent);
        log.info("成功加载 calculate.js");
    } catch (e) {
        log.error("执行 calculate.js 失败: " + e.message);
    }
}

// 3. UI 状态监控类 (简化版)
// ----------------------------------------------------------------
class UIStateMonitor {
    constructor() {
        this.lastElementState = null;
    }

    async checkStateChange() {
        // detection.js 中定义的 checkElementState
        let currentState = ELEMENT_STATE.UNKNOWN;
        try {
            if (typeof checkElementState === 'function') {
                currentState = await checkElementState();
            }
        } catch (e) {
            log.error("状态检测出错: " + e.message);
        }

        const changed = this.lastElementState !== null && this.lastElementState !== currentState;

        // 映射名称用于显示
        const stateNames = {
            [ELEMENT_STATE.MAINUI]: "主界面",
            [ELEMENT_STATE.B]: "背包界面",
            [ELEMENT_STATE.C]: "角色界面",
            [ELEMENT_STATE.O]: "好友界面",
            [ELEMENT_STATE.G]: "教程界面",
            [ELEMENT_STATE.F2]: "联机界面",
            [ELEMENT_STATE.F3]: "祈愿界面",
            [ELEMENT_STATE.F4]: "纪行界面",
            [ELEMENT_STATE.J]: "任务界面",
            [ELEMENT_STATE.Story]: "剧情界面",
            [ELEMENT_STATE.MAP]: "地图界面",
            [ELEMENT_STATE.UNKNOWN]: "未知界面"
        };

        const stateName = stateNames[currentState] || `未知(${currentState})`;

        let logMsg = null;
        if (changed) {
            const oldStateName = stateNames[this.lastElementState] || `${this.lastElementState}`;
            logMsg = `状态变更: ${oldStateName} -> ${stateName}`;
            log.info(logMsg);
        }

        this.lastElementState = currentState;
        return { currentState, changed, stateName, logMsg };
    }
}

// 4. 主逻辑循环
// ----------------------------------------------------------------
const monitor = new UIStateMonitor();
let pathHistory = [];
const MAX_HISTORY_POINTS = 50;
let pendingLogs = [];

// 辅助: 添加日志到待发送队列
function addLog(msg) {
    pendingLogs.push(msg);
    // 保持队列不过大，虽然前端也会处理
    if (pendingLogs.length > 20) pendingLogs.shift();
}

async function mainLoop() {
    log.info("开始雷达状态监控...");
    addLog("脚本已启动");

    while (true) {
        try {
            // 1. 获取坐标
            const pos = genshin.getPositionFromMap();
            // 简单的坐标有效性检查
            const isValidPos = pos.X !== 0 || pos.Y !== 0;

            if (isValidPos) {
                // 添加到历史路径
                // 为了显示效果，我们每隔一定距离或者一定时间记录一个点
                // 这里简单每帧都尝试记录，依靠前端或者简单的距离过滤
                const lastPt = pathHistory[pathHistory.length - 1];
                let shouldAdd = false;
                if (!lastPt) {
                    shouldAdd = true;
                } else {
                    // 距离检测，太近就不加了
                    const dist = Math.sqrt(Math.pow(pos.X - lastPt.x, 2) + Math.pow(pos.Y - lastPt.y, 2));
                    if (dist > 2) { // 移动超过2单位
                        shouldAdd = true;
                    }
                }

                if (shouldAdd) {
                    pathHistory.push({ x: pos.X, y: pos.Y });
                    if (pathHistory.length > MAX_HISTORY_POINTS) {
                        pathHistory.shift();
                    }
                }
            }

            // 2. 检测状态
            const stateResult = await monitor.checkStateChange();
            if (stateResult.logMsg) {
                addLog(stateResult.logMsg);
            }

            // 3. 更新 UI
            const uiData = {
                currentPos: isValidPos ? { x: pos.X, y: pos.Y } : null,
                pathHistory: pathHistory,
                currentState: stateResult.stateName,
                logs: pendingLogs.length > 0 ? [...pendingLogs] : [] // 复制数组
            };

            // 发送数据到 HTML
            // 注意: 传递大数据可能较慢，pathHistory 如果很大要注意
            const script = `updateDisplay(${JSON.stringify(uiData)})`;
            htmlPanel.eval(panelId, script).catch(e => {
                // 忽略面板关闭等错误
            });

            // 清空已发送的日志（或者保留历史？设计是 "之前状态日志"，前端是追加还是全量？本方案前端是清空重绘，所以我们应该维护一个日志缓存）
            // 修改策略：pendingLogs 作为一个长期的日志缓存（比如最近10条），每次都发过去
            // 如果前端是 clear & append，那我们发最近N条即可
            // 不需要清空 pendingLogs，只需控制长度
            while (pendingLogs.length > 10) pendingLogs.shift();


            await sleep(200); // 5FPS 刷新率

        } catch (e) {
            log.error("主循环错误: " + e.message);
            await sleep(1000);
        }
    }
}

// 启动
mainLoop();
