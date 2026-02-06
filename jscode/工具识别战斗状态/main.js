/**
 * ====================================================================
 * 工具识别战斗状态脚本 - 图像识别对象定义
 * ====================================================================
 * 功能说明：
 * 本脚本通过识别屏幕上的特定图标来判断角色状态，并自动触发战斗。
 *
 * 新增功能（攀爬/游泳状态检测豁免）：
 * - 在攀爬状态下不触发战斗检测
 * - 在游泳状态下不触发战斗检测
 * - 在交互提示状态下不触发战斗检测
 *
 * 这样可以避免在特殊移动状态下误触发自动战斗功能。
 * ====================================================================
 */

// 定义所有图标的图像识别对象，每个图片都有自己的识别区域
// 注意：坐标基于 1920x1080 分辨率，BGI会自动处理DPI缩放
const TooldisabledRo = RecognitionObject.TemplateMatch(file.readImageMatSync("assets/Tooldisabled.png"), 1800, 808, 38, 38);  // 工具栏禁用图标（战斗状态指示器）
const Space1Ro = RecognitionObject.TemplateMatch(file.readImageMatSync("assets/Space.png"), 1683, 1027, 64, 25);             // 空格提示图标位置1（交互/飞行）
const Space2Ro = RecognitionObject.TemplateMatch(file.readImageMatSync("assets/Space.png"), 1579, 1027, 64, 25);             // 空格提示图标位置2（交互/飞行）
const SwimRo = RecognitionObject.TemplateMatch(file.readImageMatSync("assets/Swim.png"), 1811, 1027, 17, 23);                // 游泳状态图标
const ClimbRo = RecognitionObject.TemplateMatch(file.readImageMatSync("assets/Climb.png"), 1596, 1027, 29, 24);              // 攀爬状态图标（新增）
const PaimonRo = RecognitionObject.TemplateMatch(file.readImageMatSync("assets/Paimon.png"), 39, 31, 38, 38);                // 派蒙菜单图标（主界面指示器）

// 战斗状态监控配置
const CONFIG = {
    CHECK_INTERVAL: 1000,           // 主循环检测间隔(ms)
    QUICK_CHECK_TIMEOUT: 200,       // 快速检测超时(ms)
    BATTLE_EXIT_DELAY: 3500,        // 战斗退出延迟(ms)
    RECOGNITION_DELAY: 50,          // 识别循环延迟(ms)
    RESET_DELAY: 3000,              // 重置状态延迟(ms)
    BATTLE_CHECK_INTERVAL: 500,     // 战斗中检测间隔(ms)
    AUTO_PICK_CONFIG: {             // AutoPick配置
        TextList: [],               // 将在初始化时从settings读取
        ForceInteraction: false     // 将在初始化时从settings读取
    },
    AUTO_SKIP_ENABLED: true,        // AutoSkip配置（无需额外配置参数）
    // 状态检测豁免配置（在这些状态下不触发战斗检测）
    IGNORE_CLIMB_STATE: true,       // 攀爬时禁用战斗检测
    IGNORE_SWIM_STATE: true,        // 游泳时禁用战斗检测
    IGNORE_FLY_STATE: true,         // 飞行时禁用战斗检测
    IGNORE_INTERACTION_STATE: true  // 交互提示时禁用战斗检测
};

// 从settings初始化配置
function initializeConfig() {
    try {
        // 检查是否启用AutoPick
        const autoPickEnabled = settings?.AutoPickEnabled ?? true;
        if (!autoPickEnabled) {
            CONFIG.AUTO_PICK_CONFIG = null;
        } else {
            // 读取AutoPick文本列表
            const textListStr = settings?.AutoPickTextList ?? "拾取,采集,收集";
            CONFIG.AUTO_PICK_CONFIG.TextList = textListStr.split(',').map(s => s.trim()).filter(s => s.length > 0);

            // 读取强制交互设置
            CONFIG.AUTO_PICK_CONFIG.ForceInteraction = settings?.ForceInteraction ?? false;

            log.info(`AutoPick配置已加载: ${JSON.stringify(CONFIG.AUTO_PICK_CONFIG)}`);
        }

        // 检查是否启用AutoSkip
        CONFIG.AUTO_SKIP_ENABLED = settings?.AutoSkipEnabled ?? true;
        log.info(`AutoSkip自动剧情功能: ${CONFIG.AUTO_SKIP_ENABLED ? '已启用' : '已禁用'}`);

        // 读取状态检测豁免配置
        CONFIG.IGNORE_CLIMB_STATE = settings?.IgnoreClimbState ?? true;
        CONFIG.IGNORE_SWIM_STATE = settings?.IgnoreSwimState ?? true;
        CONFIG.IGNORE_FLY_STATE = settings?.IgnoreFlyState ?? true;
        CONFIG.IGNORE_INTERACTION_STATE = settings?.IgnoreInteractionState ?? true;

        log.info(`状态检测豁免配置: 攀爬=${CONFIG.IGNORE_CLIMB_STATE}, 游泳=${CONFIG.IGNORE_SWIM_STATE}, 飞行=${CONFIG.IGNORE_FLY_STATE}, 交互=${CONFIG.IGNORE_INTERACTION_STATE}`);

    } catch (error) {
        log.warn(`配置初始化失败，使用默认值: ${error.message}`);
        CONFIG.AUTO_PICK_CONFIG.TextList = ["拾取", "采集", "收集"];
        CONFIG.AUTO_PICK_CONFIG.ForceInteraction = false;
        CONFIG.AUTO_SKIP_ENABLED = true;
        CONFIG.IGNORE_CLIMB_STATE = true;
        CONFIG.IGNORE_SWIM_STATE = true;
        CONFIG.IGNORE_FLY_STATE = true;
        CONFIG.IGNORE_INTERACTION_STATE = true;
    }
}

// ====================================================================
// 功能状态管理
// ====================================================================
const FEATURE_STATES = {
    battleDetection: true,    // 智能战斗检测（F6控制）
    autoPick: true,           // AutoPick自动拾取（F7控制）
    autoSkip: true,           // AutoSkip自动剧情（F8控制）
    singleBattle: false       // 单次战斗触发标志（F9触发）
};

// HTML状态面板ID
const STATUS_PANEL_ID = "battleStatusPanel";

// ====================================================================
// HTML状态面板管理
// ====================================================================

/**
 * 创建并初始化HTML状态面板
 */
function createStatusPanel() {
    try {
        // 创建悬浮窗（宽度560，高度90，位置在屏幕左上角）
        const options = JSON.stringify({
            rememberPosition: true,
            defaultX: 10,
            defaultY: 10
        });
        htmlPanel.create(STATUS_PANEL_ID, 360, 180, options);
        htmlPanel.loadHtml(STATUS_PANEL_ID, file.readTextSync("status.html"));

        // 设置窗口标题
        htmlPanel.setTitle(STATUS_PANEL_ID, "开荒用");

        // 不设置穿透模式，允许用户拖动窗口
        // htmlPanel.setLocked(STATUS_PANEL_ID, true);

        log.info("HTML状态面板已创建（可拖动）");
        return true;
    } catch (error) {
        log.error(`创建HTML状态面板失败: ${error.message}`);
        return false;
    }
}

/**
 * 更新HTML状态面板显示
 */
async function updateStatusPanel() {
    try {
        // 将状态对象注入到HTML窗口
        await htmlPanel.setGlobal(STATUS_PANEL_ID, "currentStates", FEATURE_STATES);

        // 调用HTML中的updateStatus函数
        await htmlPanel.eval(STATUS_PANEL_ID, `updateStatus(window.currentStates)`);
    } catch (error) {
        log.error(`更新状态面板失败: ${error.message}`);
    }
}

// ====================================================================
// 热键控制函数
// ====================================================================

/**
 * 切换智能战斗检测（F6）
 */
function toggleBattleDetection() {
    FEATURE_STATES.battleDetection = !FEATURE_STATES.battleDetection;
    const status = FEATURE_STATES.battleDetection ? '已开启' : '已关闭';
    log.info(`[F6] 智能战斗检测 ${status}`);
    updateStatusPanel();
}

/**
 * 切换AutoPick功能（F7）
 */
async function toggleAutoPick(battleDetector) {
    FEATURE_STATES.autoPick = !FEATURE_STATES.autoPick;
    const status = FEATURE_STATES.autoPick ? '已开启' : '已关闭';

    if (FEATURE_STATES.autoPick) {
        await battleDetector.startAutoPick();
    } else {
        await battleDetector.stopAutoPick();
    }

    log.info(`[F7] AutoPick自动拾取 ${status}`);
    updateStatusPanel();
}

/**
 * 切换AutoSkip功能（F8）
 */
async function toggleAutoSkip(battleDetector) {
    FEATURE_STATES.autoSkip = !FEATURE_STATES.autoSkip;
    const status = FEATURE_STATES.autoSkip ? '已开启' : '已关闭';

    if (FEATURE_STATES.autoSkip) {
        await battleDetector.startAutoSkip();
    } else {
        await battleDetector.stopAutoSkip();
    }

    log.info(`[F8] AutoSkip自动剧情 ${status}`);
    updateStatusPanel();
}

/**
 * 触发/取消单次战斗（F9）
 */
async function triggerSingleBattle(battleDetector) {
    if (FEATURE_STATES.singleBattle) {
        // 如果已经在单次战斗中，取消战斗
        FEATURE_STATES.singleBattle = false;
        if (battleDetector.isInBattle) {
            await battleDetector.stopAutoFight();
            log.info(`[F9] 单次战斗已取消`);
        } else {
            log.info(`[F9] 单次战斗标志已清除`);
        }
    } else {
        // 触发单次战斗
        FEATURE_STATES.singleBattle = true;
        log.info(`[F9] 单次战斗已触发`);
    }
    updateStatusPanel();
}

// 定义一个函数用于识别图像
async function recognizeImage(recognitionObject, timeout = CONFIG.QUICK_CHECK_TIMEOUT) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const imageResult = captureGameRegion().Find(recognitionObject);
            if (imageResult && !imageResult.isEmpty()) {
                return {
                    success: true,
                    x: imageResult.X,
                    y: imageResult.Y,
                    width: imageResult.Width,
                    height: imageResult.Height
                };
            }
        } catch (error) {
            log.error(`识别图像时发生异常: ${error.message}`);
            await sleep(100);
        }
        await sleep(CONFIG.RECOGNITION_DELAY);
    }
    return { success: false };
}

/**
 * 检测角色是否处于特殊移动状态（攀爬、游泳、飞行、交互）
 * @returns {Object} 返回检测结果对象
 *   - {boolean} isSpecialState - 是否处于特殊状态
 *   - {string} stateType - 状态类型: 'climb'(攀爬), 'swim'(游泳), 'fly'(飞行), 'interaction'(交互)
 *   - {string} stateDescription - 状态描述（中文）
 */
async function checkSpecialMovementStates() {
    const results = {
        isSpecialState: false,
        stateType: null,
        stateDescription: null
    };

    // 按优先级检测各种状态
    // 优先级：攀爬 > 游泳 > 飞行 > 交互
    // 这样可以确保更精确的状态识别

    // 1. 检测攀爬状态
    if (CONFIG.IGNORE_CLIMB_STATE) {
        const climbResult = await recognizeImage(ClimbRo);
        if (climbResult.success) {
            results.isSpecialState = true;
            results.stateType = 'climb';
            results.stateDescription = '攀爬';
            log.debug(`状态检测: 攀爬状态 (位置: ${climbResult.x}, ${climbResult.y})`);
            return results;
        }
    }

    // 2. 检测游泳状态
    if (CONFIG.IGNORE_SWIM_STATE) {
        const swimResult = await recognizeImage(SwimRo);
        if (swimResult.success) {
            results.isSpecialState = true;
            results.stateType = 'swim';
            results.stateDescription = '游泳';
            log.debug(`状态检测: 游泳状态 (位置: ${swimResult.x}, ${swimResult.y})`);
            return results;
        }
    }

    // 3. 检测飞行状态（空格键提示 + 非游泳非攀爬）
    if (CONFIG.IGNORE_FLY_STATE) {
        const space1Result = await recognizeImage(Space1Ro);
        const space2Result = await recognizeImage(Space2Ro);
        if (space1Result.success || space2Result.success) {
            results.isSpecialState = true;
            results.stateType = 'fly';
            results.stateDescription = '飞行';
            const pos = space1Result.success ? space1Result : space2Result;
            log.debug(`状态检测: 飞行状态 (位置: ${pos.x}, ${pos.y})`);
            return results;
        }
    }

    // 4. 检测其他交互提示状态（如果飞行检测被禁用，这里会捕获）
    if (CONFIG.IGNORE_INTERACTION_STATE && !CONFIG.IGNORE_FLY_STATE) {
        const space1Result = await recognizeImage(Space1Ro);
        const space2Result = await recognizeImage(Space2Ro);
        if (space1Result.success || space2Result.success) {
            results.isSpecialState = true;
            results.stateType = 'interaction';
            results.stateDescription = '交互';
            const pos = space1Result.success ? space1Result : space2Result;
            log.debug(`状态检测: 交互状态 (位置: ${pos.x}, ${pos.y})`);
            return results;
        }
    }

    log.debug("状态检测: 未检测到特殊移动状态");
    return results;
}

// 战斗状态检测类
class BattleStateDetector {
    constructor() {
        this.isInBattle = false;
        this.battleTask = null;
        this.cancellationTokenSource = null;
        this.autoPickTimer = null;
        this.autoSkipTimer = null;
        this.singleBattleStarted = false; // 单次战斗启动标志
    }

    // 重新加载所有触发器（用于实现停止功能）
    async reloadTriggers() {
        try {
            dispatcher.clearAllTriggers();
            let activeCount = 0;

            if (this.autoPickTimer) {
                dispatcher.addTrigger(this.autoPickTimer);
                activeCount++;
            }

            if (this.autoSkipTimer) {
                dispatcher.addTrigger(this.autoSkipTimer);
                activeCount++;
            }

            log.info(`后台触发器已刷新 (当前激活: ${activeCount})`);
            return true;
        } catch (error) {
            log.error(`刷新触发器失败: ${error.message}`);
            return false;
        }
    }

    // 启动AutoPick功能
    async startAutoPick() {
        try {
            // 检查是否启用AutoPick
            if (!CONFIG.AUTO_PICK_CONFIG) {
                log.info("AutoPick功能已禁用");
                return true;
            }

            if (!this.autoPickTimer) {
                this.autoPickTimer = new RealtimeTimer();
                this.autoPickTimer.Name = "AutoPick";
                // 正确配置AutoPick参数
                this.autoPickTimer.Config = {
                    TextList: CONFIG.AUTO_PICK_CONFIG.TextList,
                    ForceInteraction: CONFIG.AUTO_PICK_CONFIG.ForceInteraction
                };
            }

            if (await this.reloadTriggers()) {
                log.info("AutoPick自动拾取功能已启动");
                return true;
            }
            return false;
        } catch (error) {
            log.error(`启动AutoPick失败: ${error.message}`);
            this.autoPickTimer = null;
            return false;
        }
    }

    // 停止AutoPick功能
    async stopAutoPick() {
        try {
            if (!this.autoPickTimer) {
                return true;
            }

            this.autoPickTimer = null;
            await this.reloadTriggers();

            log.info("AutoPick自动拾取功能已停止");
            return true;
        } catch (error) {
            log.error(`停止AutoPick失败: ${error.message}`);
            return false;
        }
    }

    // 启动AutoSkip功能
    async startAutoSkip() {
        try {
            // 检查是否启用AutoSkip
            if (!CONFIG.AUTO_SKIP_ENABLED) {
                log.info("AutoSkip功能已禁用");
                return true;
            }

            if (!this.autoSkipTimer) {
                this.autoSkipTimer = new RealtimeTimer();
                this.autoSkipTimer.Name = "AutoSkip";
                // AutoSkip不需要Config配置，触发器会自动读取全局配置
            }

            if (await this.reloadTriggers()) {
                log.info("AutoSkip自动剧情功能已启动");
                return true;
            }
            return false;
        } catch (error) {
            log.error(`启动AutoSkip失败: ${error.message}`);
            this.autoSkipTimer = null;
            return false;
        }
    }

    // 停止AutoSkip功能
    async stopAutoSkip() {
        try {
            if (!this.autoSkipTimer) {
                return true;
            }

            this.autoSkipTimer = null;
            await this.reloadTriggers();

            log.info("AutoSkip自动剧情功能已停止");
            return true;
        } catch (error) {
            log.error(`停止AutoSkip失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 检测是否应该进入战斗状态
     * 战斗状态的判定条件：
     * 1. 工具栏被禁用（TooldisabledRo 图标出现）
     * 2. 派蒙菜单存在（在游戏主界面）
     * 3. 不处于特殊移动状态（攀爬、游泳、交互等）
     *
     * @returns {boolean} 是否应该进入战斗状态
     */
    async shouldEnterBattle() {
        // 第一步：检查工具栏是否禁用（战斗的主要指标）
        const tooldisabledResult = await recognizeImage(TooldisabledRo);
        if (!tooldisabledResult.success) {
            log.debug("未检测到工具栏禁用状态");
            return false;
        }

        // 第二步：检查派蒙菜单是否存在（确保在游戏主界面）
        const paimonResult = await recognizeImage(PaimonRo);
        if (!paimonResult.success) {
            log.debug("未检测到派蒙菜单");
            return false;
        }

        // 第三步：检查是否处于特殊移动状态（攀爬、游泳、交互）
        // 这些状态表示角色正在进行特殊移动，不应触发战斗检测
        const specialState = await checkSpecialMovementStates();
        if (specialState.isSpecialState) {
            log.debug(`检测到特殊移动状态【${specialState.stateDescription}】，跳过战斗检测`);
            return false;
        }

        // 所有条件满足，应该进入战斗状态
        log.info("满足战斗状态条件，准备启动自动战斗");
        return true;
    }

    // 检测是否应该退出战斗状态
    async shouldExitBattle() {
        // 检查工具栏是否恢复可用状态
        const tooldisabledResult = await recognizeImage(TooldisabledRo);
        if (tooldisabledResult.success) {
            return false; // 工具栏仍然禁用，继续战斗
        }

        // 确保派蒙菜单仍然存在
        const paimonResult = await recognizeImage(PaimonRo);
        if (!paimonResult.success) {
            log.warn("派蒙菜单消失，可能不在主界面");
            return false;
        }

        log.info("检测到战斗退出条件");
        return true;
    }

    // 开始自动战斗
    async startAutoFight() {
        try {
            this.cancellationTokenSource = new CancellationTokenSource();
            const battleTask = new SoloTask("AutoFight");

            log.info("启动自动战斗任务");
            this.battleTask = dispatcher.runTask(battleTask, this.cancellationTokenSource);
            this.isInBattle = true;

            return true;
        } catch (error) {
            log.error(`启动自动战斗失败: ${error.message}`);
            return false;
        }
    }

    // 停止自动战斗
    async stopAutoFight() {
        try {
            if (this.cancellationTokenSource) {
                this.cancellationTokenSource.cancel();
                log.info("已取消自动战斗任务");
            }

            this.isInBattle = false;
            this.battleTask = null;
            this.cancellationTokenSource = null;

            // 如果是单次战斗被手动停止，恢复状态
            if (FEATURE_STATES.singleBattle) {
                FEATURE_STATES.singleBattle = false;
                this.singleBattleStarted = false;
                log.info("[单次战斗] 已手动停止");
                await updateStatusPanel();
            }

            return true;
        } catch (error) {
            log.error(`停止自动战斗失败: ${error.message}`);
            return false;
        }
    }

    // 清理所有资源
    async cleanup() {
        try {
            // 停止战斗任务
            if (this.isInBattle) {
                await this.stopAutoFight();
            }

            // 停止AutoPick（可选，根据需求决定是否保持运行）
            // await this.stopAutoPick();

            // 停止AutoSkip（可选，根据需求决定是否保持运行）
            // await this.stopAutoSkip();

            log.info("战斗检测器资源清理完成");
        } catch (error) {
            log.error(`清理资源时出错: ${error.message}`);
        }
    }

    // 战斗状态监控循环
    async monitorBattleState() {
        let tooldisabledDisappearTime = Date.now();

        while (this.isInBattle) {
            try {
                const tooldisabledResult = await recognizeImage(TooldisabledRo);

                if (!tooldisabledResult.success) {
                    // 工具栏不再禁用，开始计时
                    if (Date.now() - tooldisabledDisappearTime >= CONFIG.BATTLE_EXIT_DELAY) {
                        if (await this.shouldExitBattle()) {
                            log.info("战斗状态结束");
                            await this.stopAutoFight();

                            // 如果是单次战斗，恢复状态
                            if (FEATURE_STATES.singleBattle) {
                                FEATURE_STATES.singleBattle = false;
                                this.singleBattleStarted = false;
                                log.info("[单次战斗] 已完成，恢复正常模式");
                                await updateStatusPanel();
                            }
                            break;
                        }
                    }
                } else {
                    // 工具栏仍然禁用，重置计时
                    tooldisabledDisappearTime = Date.now();
                }

                await sleep(CONFIG.BATTLE_CHECK_INTERVAL);
            } catch (error) {
                log.error(`战斗监控出错: ${error.message}`);
                await sleep(1000);
            }
        }
    }
}

// 主程序入口
(async function () {
    let keyHook = null;  // 键盘钩子实例
    let battleDetector = null;  // 战斗检测器实例

    try {
        // 初始化配置
        initializeConfig();

        // 初始化游戏环境
        setGameMetrics(1920, 1080, 1);
        log.info("正在返回主界面...");
        await genshin.returnMainUi();

        // 创建HTML状态面板
        createStatusPanel();
        await sleep(1000);  // 等待面板完全加载
        await updateStatusPanel();

        // 初始化战斗检测器
        battleDetector = new BattleStateDetector();
        log.info("战斗状态监控器已启动");

        // 启动AutoPick自动拾取功能
        if (await battleDetector.startAutoPick()) {
            log.info("AutoPick自动拾取功能已启用，将持续运行");
        } else {
            log.warn("AutoPick启动失败，但脚本将继续运行");
            FEATURE_STATES.autoPick = false;
            await updateStatusPanel();
        }

        // 启动AutoSkip自动剧情功能
        if (await battleDetector.startAutoSkip()) {
            log.info("AutoSkip自动剧情功能已启用，将持续运行");
        } else {
            log.warn("AutoSkip启动失败，但脚本将继续运行");
            FEATURE_STATES.autoSkip = false;
            await updateStatusPanel();
        }

        // 初始化键盘钩子监听
        keyHook = new KeyMouseHook();
        keyHook.OnKeyDown((keyCode) => {
            try {
                switch (keyCode) {
                    case 'F6':
                        toggleBattleDetection();
                        break;
                    case 'F7':
                        toggleAutoPick(battleDetector);
                        break;
                    case 'F8':
                        toggleAutoSkip(battleDetector);
                        break;
                    case 'F9':
                        triggerSingleBattle(battleDetector);
                        break;
                }
            } catch (error) {
                log.error(`处理热键时出错: ${error.message}`);
            }
        });

        log.info("热键监听已启动: F6=战斗检测 | F7=自动拾取 | F8=自动剧情 | F9=单次战斗(切换)");

        while (true) {
            try {
                if (!battleDetector.isInBattle) {
                    // 非战斗状态：检测是否应该进入战斗

                    // 单次战斗模式：直接启动战斗，无需检测
                    if (FEATURE_STATES.singleBattle && !battleDetector.singleBattleStarted) {
                        log.info("[单次战斗] 立即启动自动战斗");
                        if (await battleDetector.startAutoFight()) {
                            battleDetector.singleBattleStarted = true;

                            // 1秒后启动战斗监控
                            await sleep(1000);
                            if (battleDetector.isInBattle && FEATURE_STATES.singleBattle) {
                                log.info("[单次战斗] 1秒后启动战斗状态检测");
                                battleDetector.monitorBattleState();
                            }
                        } else {
                            log.error("单次战斗启动失败");
                            FEATURE_STATES.singleBattle = false;
                            battleDetector.singleBattleStarted = false;
                            await updateStatusPanel();
                        }
                    }
                    // 智能战斗检测模式
                    else if (FEATURE_STATES.battleDetection && await battleDetector.shouldEnterBattle()) {
                        log.info("检测到战斗条件，启动自动战斗");

                        if (await battleDetector.startAutoFight()) {
                            // 启动战斗监控
                            battleDetector.monitorBattleState();
                        } else {
                            log.error("自动战斗启动失败，等待重试");
                            await sleep(CONFIG.RESET_DELAY);
                        }
                    }

                    // 非战斗状态使用较长的检测间隔
                    await sleep(CONFIG.CHECK_INTERVAL);
                } else {
                    // 战斗状态：等待战斗监控完成
                    await sleep(CONFIG.BATTLE_CHECK_INTERVAL);
                }

            } catch (error) {
                log.error(`主循环异常: ${error.message}`);

                // 发生异常时重置战斗状态
                if (battleDetector.isInBattle) {
                    await battleDetector.stopAutoFight();
                }

                await sleep(CONFIG.RESET_DELAY);
            }
        }

    } catch (error) {
        log.error(`脚本运行出错: ${error.message}`);
        throw error;
    } finally {
        // 脚本退出时清理资源
        log.info("正在清理资源...");

        // 清理键盘钩子
        if (keyHook) {
            try {
                keyHook.Dispose();
                log.info("键盘钩子已释放");
            } catch (error) {
                log.error(`释放键盘钩子失败: ${error.message}`);
            }
        }

        // 清理战斗检测器
        if (battleDetector) {
            try {
                await battleDetector.cleanup();
                log.info("战斗检测器已清理");
            } catch (error) {
                log.error(`清理战斗检测器失败: ${error.message}`);
            }
        }

        // 关闭HTML状态面板
        try {
            htmlPanel.close(STATUS_PANEL_ID);
            log.info("HTML状态面板已关闭");
        } catch (error) {
            log.error(`关闭状态面板失败: ${error.message}`);
        }

        log.info("资源清理完成");
    }
})();
