#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const getVideoInfo = require("get-video-info");
const signale = require("signale");
const colors = require("colors");

const curMediasPath = process.cwd();
const dirList = fs.readdirSync(curMediasPath); // 获取文件列表
const newDirList = filter_Ds_Store(dirList); // 过滤出mp3和mp4文件
signale.success(
  "当前音视频目录是:",
  colors.yellow(curMediasPath),
  "音频包名:",
  colors.yellow(process.argv[2])
);

if (
  dirList.filter((item) => item.includes(".mp3") || item.includes(".mp4"))
    .length === 0
)
  return;

dirList.forEach((item) => {
  const filePath = path.resolve(curMediasPath, item);
  //   当前目录中如果有文件夹 提示
  fs.stat(filePath, (err, stat) => {
    if (stat.isDirectory()) {
      signale.warn("当前目录中有一个文件夹：" + colors.yellow(item));
    }
  });
  // 删除图片
  if (item.includes(".jpg") || item.includes(".png")) {
    fs.removeSync(filePath);
    signale.success(colors.red(item + "已删除！"));
    return;
  }
});
const output = fs.createWriteStream(`${curMediasPath}/${process.argv[2]}.zip`);
const archive = archiver("zip", {
  zlib: { level: 9 }, // Sets the compression level.
});

function filter_Ds_Store(arr) {
  return arr.filter((item) => item.includes(".mp3") || item.includes(".mp4"));
}

newDirList.forEach((item) => {
  const filePath = path.resolve(curMediasPath, item);
  const ext = path.extname(item);
  switch (ext) {
    case ".mp3":
      archive.append(fs.createReadStream(filePath), { name: item });
      break;
    case ".mp4":
      if (!item.includes("_mute.mp4")) {
        fs.removeSync(filePath);
        signale.success(colors.red(item + "已删除！"));
      } else {
        getVideoInfo(filePath).then((info) => {
          const bitSize = Math.round(info.format.bit_rate / 1000);
          if (bitSize >= 900) {
            signale.warn(colors.yellow(item + " 文件大小异常!"));
          }
        });
        archive.append(fs.createReadStream(filePath), { name: item });
      }
      break;
  }
});
archive.pipe(output); //将打包对象与输出流关联
//监听所有archive数据都写完
output.on("close", function () {
  signale.success(
    colors.green("压缩完成"),
    colors.yellow(archive.pointer() / 1024 / 1024 + "M")
  );
});
archive.on("error", function (err) {
  throw err;
});
//打包
archive.finalize();
