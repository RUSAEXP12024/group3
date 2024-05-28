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
const command = `curl --digest -o "${filePath}" -u admin:h809 http://192.168.100.1:63428/snapshot.jpg`;

const command1= ` curl --digest --user admin:h809 "http://192.168.100.1:63428/camera-cgi/admin/param.cgi?action=MusicCtrl&MusicPlay=3"`;

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

setInterval(downloadImage, 300000);

// プログラム開始時にすぐに画像をダウンロード
downloadImage();