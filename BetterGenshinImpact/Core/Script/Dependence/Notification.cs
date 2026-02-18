using System;
using System.IO;
using BetterGenshinImpact.Core.Config;
using BetterGenshinImpact.GameTask;
using BetterGenshinImpact.GameTask.Model.Area;
using BetterGenshinImpact.Service.Notification;
using BetterGenshinImpact.Service.Notification.Model;
using BetterGenshinImpact.Service.Notification.Model.Enum;
using Microsoft.Extensions.Logging;
using OpenCvSharp;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Image = SixLabors.ImageSharp.Image;

namespace BetterGenshinImpact.Core.Script.Dependence;

public class Notification
{
    private readonly AllConfig _config = TaskContext.Instance().Config;
    private readonly ILogger<Notification> _logger = App.GetLogger<Notification>();

    private bool CheckNotificationPermission()
    {
        try
        {
            var currentProject = TaskContext.Instance().CurrentScriptProject;
            return _config.NotificationConfig.JsNotificationEnabled &&
                   (currentProject?.AllowJsNotification ?? true);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// 发送成功通知
    /// </summary>
    /// <param name="message">通知消息</param>
    public void Send(string message)
    {
        if (!CheckNotificationPermission())
        {
            _logger.LogWarning("JS 通知关闭，消息被拦截: " + message);
            return;
        }

        Notify.Event(NotificationEvent.JsCustom).Send(message);
        _logger.LogInformation("通知发送成功：" + message);
    }

    /// <summary>
    /// 发送带图片的通知（通过文件路径）
    /// </summary>
    /// <param name="message">通知消息</param>
    /// <param name="imagePath">图片文件路径（支持 png/jpg/bmp/webp 等常见格式）</param>
    public void SendWithImage(string message, string imagePath)
    {
        if (!CheckNotificationPermission())
        {
            _logger.LogWarning("JS 通知关闭，消息被拦截: " + message);
            return;
        }

        try
        {
            if (!File.Exists(imagePath))
            {
                _logger.LogWarning("通知图片文件不存在: " + imagePath);
                return;
            }

            using var image = Image.Load<Rgb24>(imagePath);
            SendNotificationWithImage(message, image.Clone());
        }
        catch (Exception ex)
        {
            _logger.LogError("发送带图片通知失败: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 发送带图片的通知（通过 captureGameRegion() 返回的 ImageRegion）
    /// </summary>
    /// <param name="message">通知消息</param>
    /// <param name="region">captureGameRegion() 返回的 ImageRegion 对象</param>
    public void SendWithImage(string message, ImageRegion region)
    {
        if (!CheckNotificationPermission())
        {
            _logger.LogWarning("JS 通知关闭，消息被拦截: " + message);
            return;
        }

        try
        {
            SendNotificationWithImage(message, region.CacheImage.Clone());
        }
        catch (Exception ex)
        {
            _logger.LogError("发送带图片通知失败: {Message}", ex.Message);
        }
    }

    /// <summary>
    /// 发送带图片的通知（通过 Mat 对象）
    /// </summary>
    /// <param name="message">通知消息</param>
    /// <param name="mat">OpenCV Mat 对象</param>
    public unsafe void SendWithImage(string message, Mat mat)
    {
        if (!CheckNotificationPermission())
        {
            _logger.LogWarning("JS 通知关闭，消息被拦截: " + message);
            return;
        }

        try
        {
            using var rgb = mat.CvtColor(ColorConversionCodes.BGR2RGB);
            var bufferSize = (int)rgb.Step() * rgb.Height;
            using var image = Image.WrapMemory<Rgb24>(rgb.DataPointer, bufferSize, rgb.Width, rgb.Height);
            SendNotificationWithImage(message, image.Clone());
        }
        catch (Exception ex)
        {
            _logger.LogError("发送带图片通知失败: {Message}", ex.Message);
        }
    }

    private void SendNotificationWithImage(string message, Image<Rgb24> screenshot)
    {
        var data = new BaseNotificationData
        {
            Event = NotificationEvent.JsCustom.Code,
            Message = message,
            Result = NotificationEventResult.Success,
            Screenshot = screenshot
        };
        NotificationService.Instance().NotifyAllNotifiers(data);
        _logger.LogInformation("带图片通知发送成功：" + message);
    }

    /// <summary>
    /// 发送错误通知
    /// </summary>
    /// <param name="message">通知消息</param>
    public void Error(string message)
    {
        if (!CheckNotificationPermission())
        {
            _logger.LogWarning("JS 通知关闭，消息被拦截: " + message);
            return;
        }

        Notify.Event(NotificationEvent.JsError).Error(message);
        _logger.LogInformation("错误通知发送成功：" + message);
    }
}