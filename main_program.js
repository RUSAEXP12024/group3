const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require("express")
const { messagingApi, middleware } = require("@line/bot-sdk")
require('dotenv').config();
const { linegrok } = require("linegrok")

const ACCESS_TOKEN = '2bBakBduoZdFBhuZq6QIQVuvZsJGAN0fl2YQK627ptY.TB_Ji4Vk6_SidCOSWrQtQrxrh4Ji6TWhc8SVlO8zUoM';                                             //////<-この行remoo3のやつ
const channelAccessToken = process.env.CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.CHANNEL_SECRET;
const port = process.env.PORT;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const REMO_API_URL = 'https://api.nature.global/1/devices';

const { exec } = require('child_process');

// CSVファイルのパス
const CSV_FILE = path.join(__dirname, 'remo3_motion_data.csv');            ///////////この行のremo3_motion_data.csv

// 定期的にデータを取得して処理する間隔（ミリ秒単位）
const interval = 10000; // 10秒ごとにデータを取得

linegrok({ channelAccessToken, port });

const client = new messagingApi.MessagingApiClient({ channelAccessToken });

const app = express();

app.post("/", middleware({ channelSecret }), (req, res) => {
    handleEvents(req.body.events);
    res.send({ status: 200 });
});

app.listen(port, () => console.log(`Start server!`));

// CSVファイルへの書き込みを行うかどうかのフラグ
let writeToCsv = true;

// イベントの処理を行う関数
const handleEvents = events => {
    events.forEach(event => {
        switch (event.type) {
            case "message":
                handleMessageEvent(event);
                break;
            default:
                console.log(`Unknown event type: ${event.type}`);
        }
    });
};

// イベントメッセージの処理を行う関数
const handleMessageEvent = event => {
    const messageText = event.message.text;
    switch (messageText) {
        case "在宅":
            handleStayAtHome(event); // 在宅の場合の処理
            break;
        case "外出":
            handleGoOut(event); // 外出の場合の処理
            break;
        default:
            handleOtherMessages(event); // その他のメッセージの場合の処理
    }
};

// 在宅の場合の処理を行う関数
const handleStayAtHome = event => {
    // 在宅の場合の処理を記述
    client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "在宅中ですね。人感センサをOFFにします。" }]
    });
    // CSVファイルへの書き込みを停止
    writeToCsv = false;
};

// 外出の場合の処理を行う関数
const handleGoOut = event => {
    // 外出の場合の処理を記述
    client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "外出中ですね。人感センサをONにします。" }]
    });
    // CSVファイルへの書き込みを再開
    writeToCsv = true;
    // センサーデータを取得する
    getSensorData();
};

// その他のメッセージの場合の処理を行う関数
const handleOtherMessages = event => {
    // その他のメッセージに対するデフォルトの処理を記述
    client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "外出または在宅をチャットしてください"}]
    });
};


// センサーデータを取得して処理する関数
const getSensorData = async () => {
    try {
        if (writeToCsv) {
            const response = await axios.get(REMO_API_URL, {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`
                }
            });

            const devices = response.data;
            const now = new Date();
            let motionDetected = false;

            devices.forEach(device => {
                if (device.newest_events && device.newest_events.mo) {
                    const motionSensor = device.newest_events.mo;
                    const detectedTime = new Date(motionSensor.created_at);
                    const timeDiff = (now - detectedTime) / 1000;

                    if (timeDiff <= 15) {
                        motionDetected = true;
                    }
                }
            });

            if (motionDetected) {
                // シェルコマンドの実行
                downloadImage();

                appendToCSV(now.toISOString(), now.toISOString()); // 実行時間と反応時間をCSVに追加
		
		
            } else {
                appendToCSV(now.toISOString(), 'なし'); // 実行時間と「なし」をCSVに追加
            }
        }
    } catch (error) {
        console.error('データ取得中にエラーが発生しました:', error.message);
        if (error.response) {
            console.error('ステータスコード:', error.response.status);
            console.error('レスポンスヘッダー:', error.response.headers);
            console.error('レスポンスデータ:', error.response.data);
        }
    }
};l

// CSVファイルにデータを追記する関数
const appendToCSV = (executionTime, reactionTime) => {
    const csvRow = `${executionTime},${reactionTime}\n`;

    fs.appendFile(CSV_FILE, csvRow, err => {
        if (err) {
            console.error('CSVファイルに書き込めませんでした:', err);
        } else {
            console.log('データがCSVファイルに正常に書き込まれました。');
        }
    });
};



// 10秒ごとにデータを取得する
setInterval(getSensorData, interval);



//カメラ操作モジュール
function downloadImage() {

  const { exec } = require('child_process');
  const path = require('path');
  
  // 相対パスで指定するディレクトリ
  const relativePath = './camera_picture'; // ここを適切な相対パスに変更
  
  // 現在の日付と時刻を取得
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  // ファイル名を日付と時刻に基づいて設定
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  const fileName = `picture_${timestamp}.jpg`;
  
  // 相対パスを使用して、ファイルのフルパスを作成
  const filePath = path.join(__dirname, relativePath, fileName);
  
  // ファイル作成のためのシェルコマンド
  const command = `curl --digest -o "${filePath}" -u admin:h809 http://192.168.0.11:63428/snapshot.jpg`;
  
  const command1= ` curl --digest --user admin:h809 "http://192.168.0.11:63428/camera-cgi/admin/param.cgi?action=MusicCtrl&MusicPlay=3"`;
  
  // execを使用してシェルコマンドを実行
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`エラーが発生しました: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`ファイル ${filePath} が作成されました`);
  });
  
  // execを使用してシェルコマンドを実行
  exec(command1, (error, stdout, stderr) => {
    if (error) {
      console.error(`エラーが発生しました: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  });
  
  }
