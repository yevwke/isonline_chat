
console.log("SCRIPT STARTED");

/*
====================================================
НАСТРОЙКИ ВРЕМЕНИ (ДЛЯ ТЕСТА)
====================================================
*/

const COMMON_INTERVAL = 20 * 1000; // 20 секунд (тест)
const RARE_INTERVAL = 43 * 1000;   // 45 секунд (тест)

/*
====================================================
ДАННЫЕ
====================================================
*/

let commonMessages = [];
let rareMessages = [];

/*
Запоминаем последний показанный индекс,
чтобы не спамить одно и то же сообщение
*/
let lastCommonIndex = null;
let lastRareIndex = null;

/*
Сдвиг между серверным временем и локальным
*/
let serverOffset = 0;

/*
====================================================
АВТОСКРОЛЛ
====================================================
*/

/*
Флаг:
true  = пользователь сейчас внизу чата
false = пользователь прокрутил вверх
*/
let isUserAtBottom = true;


/*
====================================================
ПОЛУЧЕНИЕ СЕРВЕРНОГО ВРЕМЕНИ
====================================================
*/
async function getServerTime() {
    // Берём стабильное UTC время
    const res = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=UTC");

    const data = await res.json();

    // ISO строка времени → Date
    return new Date(data.dateTime);
    }

/*
====================================================
ЗАГРУЗКА JSON
====================================================
*/
async function loadMessages() {
    const commonRes = await fetch("chatcommon.json");
    const rareRes = await fetch("chatrare.json");

    commonMessages = await commonRes.json();
    rareMessages = await rareRes.json();
}

/*
====================================================
ОТРИСОВКА СООБЩЕНИЯ
====================================================
*/
function appendMessage(msg) {
    const container = document.getElementById("messages");

    const div = document.createElement("div");
    div.className = "message";

    div.innerHTML = `
        <span class="channel">[${msg.channel}]</span>
        <span class="nickname">[${msg.nickname}]</span>
        <span class="text"> ${msg.text}</span>
    `;

    container.appendChild(div);
     /*
    Если пользователь сейчас
    внизу чата -
    автоматически прокручиваем.
    */
    if (isUserAtBottom) {
        scrollChatToBottom();
    }
}
/*
====================================================
ПРОВЕРКА:
ПОЛЬЗОВАТЕЛЬ ВНИЗУ ИЛИ НЕТ
====================================================
*/

function updateUserScrollState() {

    /*
    Берем чат-контейнер
    */
    const chat =
        document.getElementById("chat");

    /*
    scrollTop
    = насколько пользователь уже прокрутил вниз

    clientHeight
    = видимая высота окна

    scrollHeight
    = полная высота всех сообщений
    */

    /*
    Небольшой запас,
    чтобы не было дерганий.
    */
    const threshold = 50;

    /*
    Если нижний край окна
    почти касается конца контента,
    считаем что пользователь "внизу".
    */
    isUserAtBottom =
        chat.scrollTop +
        chat.clientHeight >=
        chat.scrollHeight -
        threshold;
}
/*
====================================================
ПРОКРУТИТЬ ЧАТ ВНИЗ
====================================================
*/

function scrollChatToBottom() {

    const chat =
        document.getElementById("chat");

    /*
    Прыгаем в самый низ.
    Из-за CSS scroll-behavior
    это будет плавно.
    */
    chat.scrollTop =
        chat.scrollHeight;
}
/*
====================================================
СУТОЧНЫЙ ЦИКЛ
====================================================
*/
function getDailyIndex(now, interval, length) {
    if (!length) return 0; // защита от пустого массива

    const midnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0
    );

    const elapsed = now - midnight;

    const slot = Math.floor(elapsed / interval);

    return slot % length;
}

/*
====================================================
ПРОВЕРКА СООБЩЕНИЙ
====================================================
*/
function checkMessages() {

    const now = new Date(Date.now() + serverOffset);

    if (!commonMessages.length || !rareMessages.length) return;

    const commonIndex = getDailyIndex(
        now,
        COMMON_INTERVAL,
        commonMessages.length
    );

    const rareIndex = getDailyIndex(
        now,
        RARE_INTERVAL,
        rareMessages.length
    );

    /*
    Показываем ТОЛЬКО если индекс изменился
    и уже не первый запуск
    */

    if (
        lastCommonIndex !== null &&
        commonIndex !== lastCommonIndex
    ) {
        appendMessage(commonMessages[commonIndex]);
    }

    if (
        lastRareIndex !== null &&
        rareIndex !== lastRareIndex
    ) {
        appendMessage(rareMessages[rareIndex]);
    }

    lastCommonIndex = commonIndex;
    lastRareIndex = rareIndex;
}

/*
====================================================
ИНИЦИАЛИЗАЦИЯ
====================================================
*/
async function init() {

    await loadMessages();

    let serverTime;

    try {
        serverTime = await getServerTime();
    } catch (e) {
        console.log("time API failed, fallback local time");
        serverTime = new Date();
    }

    serverOffset = serverTime - new Date();

    /*
    ВАЖНО:
    просто фиксируем текущие индексы,
    но НЕ выводим их (иначе будет дублирование)
    */

    lastCommonIndex = getDailyIndex(
        serverTime,
        COMMON_INTERVAL,
        commonMessages.length
    );

    lastRareIndex = getDailyIndex(
        serverTime,
        RARE_INTERVAL,
        rareMessages.length
    );

    /*
    запускаем проверку каждую секунду
    */
    setInterval(checkMessages, 10 * 1000);
    //setInterval(checkMessages, 60 * 1000); // если реже
        /*
    Следим,
    прокрутил ли пользователь чат.
    */
    const chat =
        document.getElementById("chat");

    chat.addEventListener(
        "scroll",
        updateUserScrollState
    );
}

/*
====================================================
СТАРТ
====================================================
*/

init();