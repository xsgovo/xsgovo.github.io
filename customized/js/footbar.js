var now = new Date;

function createtime() {
    now.setTime(now.getTime() + 1e3);
    var o = new Date("08/09/2022 00:00:00"),
        n = (now - o) / 1e3 / 60 / 60 / 24,
        day = Math.floor(n),
        i = (now - o) / 1e3 / 60 / 60 - 24 * day,
        hour = Math.floor(i);
    var d = (now - o) / 1e3 / 60 - 1440 * day - 60 * hour,
        minute = Math.floor(d).toString().padStart(2, "0");

    var g = (now - o) / 1e3 - 86400 * day - 3600 * hour - 60 * minute,
        second = Math.round(g).toString().padStart(2, "0");
    var string = `<div style="font-size:13px;font-weight:bold">本站居然运行了 ${day} 天 ${hour} 小时 ${minute} 分 ${second} 秒 <i id="heartbeat" class='fas fa-heartbeat'></i></div>`;

    document.getElementById("workboard") && (document.getElementById("workboard").innerHTML = string);
}
setInterval((() => {
    createtime()
}), 1e3);