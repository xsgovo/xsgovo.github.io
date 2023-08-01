
// 计算时间差的函数：获取两个日期之间的天数差
function getTimeDifferenceInDays(startDate, endDate) {
    return (endDate - startDate) / 1000 / 60 / 60 / 24;
}

// 计算时间差的函数：获取两个日期之间的秒数差
function getTimeDifferenceInSeconds(startDate, endDate) {
    return Math.floor((endDate - startDate) / 1000);
}

// 格式化时间数值，使其变成两位数
function formatTimeValue(value) {
    return value.toString().padStart(2, "0");
}

// 更新工作面板内容的函数
function updateWorkboardContent() {
    // 获取当前时间的 Date 对象
    var now = new Date();
    // 获取当前时间并加上1秒，即使 now 表示下一秒的时间
    now.setTime(now.getTime() + 1000);
    // 指定一个特定日期 "2023/07/13 00:00:00"
    var startTime = new Date("2023/07/13 00:00:00");

    // 计算当前时间与特定日期之间的数差
    var day = Math.floor(getTimeDifferenceInDays(startTime, now));
    var hour = Math.floor((getTimeDifferenceInSeconds(startTime, now) - day * 86400) / 3600);
    var minute = formatTimeValue(Math.floor((getTimeDifferenceInSeconds(startTime, now) - day * 86400 - hour * 3600) / 60));
    var second = formatTimeValue(Math.floor(getTimeDifferenceInSeconds(startTime, now) - day * 86400 - hour * 3600 - minute * 60));

    // 构造显示的字符串内容
    var string = `<div style="font-size:13px;font-weight:bold">本站居然运行了 ${day} 天 ${hour} 小时 ${minute} 分 ${second} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i></div>`;

    // 获取工作面板元素并更新内容
    var workboardElement = document.getElementById("workboard");
    if (workboardElement) {
        workboardElement.innerHTML = string;
    }
}

// 每秒钟调用一次 updateWorkboardContent 函数，实现页面内容的每秒更新
setInterval(updateWorkboardContent, 1000);
