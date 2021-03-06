import buttons from './Buttons';
import bucket from './BucketLogic';

let TelegramBot = require('node-telegram-bot-api');
let token = '430043343:AAFMmGRtyNMiFRdZN6Iy1rhNzz7UZpLMSh4';
let mysql = require('mysql');
let bot = new TelegramBot(token, {polling: true});
let chat, mainEntry = [], fillings = [], pizzerias =[], bucketList = [], address, telephone,
    selectedPizzeria, status;

let con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "cfvgbh",
    database: "pizzeria"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");

});

bot.on('callback_query', function (msg) {
    if (fillings.includes(msg.data)) {
        bucket.saveToBucket(msg.data)
    } else if (pizzerias.includes(msg.data)) {
        selectedPizzeria = pizzerias.indexOf(msg.data) + 1;
        showMenu(msg);
    } else if (msg.data === 'orderPizza') {
        mainChoice(msg);
    } else if (msg.data === 'Да') {
        enterAddress(msg, bot);
    } else if (msg.data === 'Посмотреть заказ') {
        bucket.showBucket(msg, bot);
    } else if (msg.data === 'Готовую') {
        choosePizza(msg);
    } else if (msg.data === 'Собрать свою') {
        createPizza(msg);
    }
});

bot.on('message', (msg) => {
    if (msg.text === '/выбратьпиццерию') {
        choosePizzeria(msg);
        chat = msg;
    } else if (status === 'enteredAddress') {
        console.log(msg.text);
        getTelephone(msg, bot);
    } else if (status === 'saveToBd') {
        telephone = msg.text;
        bucket.saveToBd(msg, telephone, address,selectedPizzeria, con, bot);
        bot.sendMessage(msg.from.id, 'Ваш заказ принят');
        bucketList.length = 0;
    }
});

//Work with bd
//
let getInfo = (sql, col1, col2) => {
    return new Promise(function (resolve, reject) {
        con.query(sql, function (err, result) {
            if (err) throw err;
            let res = JSON.stringify(result);
            let res2 = JSON.parse(res);
            for (let i = 0; i < res2.length; i++) {
                let entry = [];
                if (pizzerias.includes(res2[i][col1]) || res2[i]['pizzeria_id'] === selectedPizzeria) {
                    if (col2) {
                        entry = [{
                            text: `${res2[i][col1]} - ${res2[i][col2]} грн`,
                            callback_data: `${res2[i][col1]} - ${res2[i][col2]}`
                        }];
                        fillings.push(`${res2[i][col1]} - ${res2[i][col2]}`);
                    }
                    else {
                        entry = [{text: `${res2[i][col1]}`, callback_data: `${res2[i][col1]}`}];
                        pizzerias.push(`${res2[i][col1]}`);
                    }
                }
                mainEntry.push(entry);
                if (err) {
                    return reject(err);
                }
                resolve(mainEntry);
            }
        });
        mainEntry.length = 0;
    })
};
// choosing
let mainChoice = (msg) => {
    let text = 'Готовую пиццу или собрать свою?';
    let options = [
        [{text: 'Готовую', callback_data: 'Готовую'}],
        [{text: 'Собрать свою', callback_data: 'Собрать свою'}]
    ];
    buttons.create(options, msg, text, bot)
};

let choosePizzeria = (msg) => {
    getInfo("SELECT * FROM pizzeria", 'name').then(function () {
        buttons.create(mainEntry, msg, 'Выберите пиццу', bot);
    })
};

let showMenu = (msg) => {
    chat = msg.hasOwnProperty('chat') ? msg.chat.id : msg.from.id;
    let pizzeria = pizzerias[selectedPizzeria - 1];
    getInfo("SELECT * FROM pizza", 'pizza_name', 'composition').then(function () {
        let res = JSON.stringify(mainEntry);
        let res2 = JSON.parse(res);
        // function
        for (let index in res2) {
            for (let i in res2[index]) {
                bot.sendPhoto(chat, `D:/telegram_bot/img/${pizzeria}/${res2[index][i]['text'].split(' - ')[0]}.jpg`, {caption: `${res2[index][i]['text']}`});
            }
        }
        //
        setTimeoutForButton();

    });

};

let setTimeoutForButton = () => {
    setTimeout(function () {
        let options = {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    [{text: 'Заказать!', callback_data: 'orderPizza'}],
                ]
            })
        };
        bot.sendMessage(chat, "Готовы сделать заказ?", options)
    }, 4000)
};

let createPizza = (msg) => {
    getInfo("SELECT * FROM filter", 'filter', 'cost').then(function () {
        buttons.create(mainEntry, msg, 'Выберите начинку', bot);
        buttons.saveButton(msg);
    });
};

let choosePizza = (msg) => {
    getInfo("SELECT * FROM pizza", 'pizza_name', 'cost').then(function () {
        buttons.create(mainEntry, msg, 'Выберите пиццу', bot);
        buttons.saveButton(msg);
    });
};

let enterAddress = (msg) => {
    bot.sendMessage(chat, 'Введите адресс')
        .then(function () {
            bot.on('message', (msg) => {
                address = msg.text;
            })
        });
    status = 'enteredAddress';

};

let getTelephone = (msg) => {
    status = 'saveToBd';
    bot.sendMessage(chat, 'Введите телефон').then(function () {
    })
};

