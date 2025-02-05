import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

let fileCounter = 1;
const resultFolder = "temp";
const folderPath = path.normalize(`${path.resolve()}/${resultFolder}`);
let res = "";
const addRes = (text, val) => {
  res += `${new Date().toLocaleString()}: ${text}: ${val}
`;
};

const getTextContent = async (page, selector)=>{
  let textSelector = await page.waitForSelector(selector);
  return textSelector?.evaluate((el) => el.textContent);
}

(async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    // headless: false,
    // slowMo: 250,
  });
  const page = await browser.newPage();

  // Tracing
  await page.tracing.start({path: './temp/0trace.json'});

  // Navigate the page to a URL
  await page.goto("https://zenit.win/");

  // Set screen size
  await page.setViewport({ width: 1200, height: 1024 });

  // ждать загрузки страницы
  await page.waitForSelector(".Event-Icon.f-s-ico-fav");

  //#region Первый чемпионат
  let textContent = await getTextContent(page, ".divmain.cupis .l-t .l-th-name");
  addRes('Первый чемпионат на главной', textContent); 
  let imgPath = `./${resultFolder}/${fileCounter++}main_`;
  await page.screenshot({
    path: `${imgPath}1.png`,
  });
  compareImg(`${imgPath}0.png`, `${imgPath}1.png`, `${imgPath}diff.png`);
  //#endregion

  //#region Первый матч
  await page.click(".header-kids__menu-item");
  textContent = await getTextContent(page, ".l-t .g-d.g-d-s.line");
  addRes('Первый матч на странице линии', textContent.trim()); 
  imgPath = `./${resultFolder}/${fileCounter++}prematch_`;
  await page.screenshot({
    path: `${imgPath}1.png`,
  });
  compareImg(`${imgPath}0.png`, `${imgPath}1.png`, `${imgPath}diff.png`);
  //#endregion

  //#region Авторизация
  await page.click(".login-group-login");
  await page.type("#reg-phone", "1129845");
  await page.type(".LoginModal-Password", "111111");
  const content = await page.waitForSelector(".LoginModal-Modal");
  imgPath = `./${resultFolder}/${fileCounter++}LogIn_`;
  await content.screenshot({
    path: `${imgPath}1.png`,
  });
  compareImg(`${imgPath}0.png`, `${imgPath}1.png`, `${imgPath}diff.png`);
  await page.click(".LoginModal-Modal .flat_button");
  await page.waitForSelector(".header-balance-amount");
  imgPath = `./${resultFolder}/${fileCounter++}afterLogIn_`;
  await page.screenshot({
    path: `${imgPath}1.png`,
  });
  compareImg(`${imgPath}0.png`, `${imgPath}1.png`, `${imgPath}diff.png`);
  //#endregion

  //#region cookies
  const cookies = await browser.cookies();
  const userId = cookies.find((item) => item.name == "userId");
  addRes('cookies.userId', userId.value); 
  //#endregion

  //#region save res
  await page.tracing.stop();

  // Page.metrics
  const metrics = await page.metrics()
  addRes('Page.metrics', JSON.stringify(metrics)); 
  
  const filePath = `${folderPath}/0res`;
  fs.writeFile(filePath, res, (err) => {
    if (err) {
      console.error("Ошибка записи в файл: " + filePath, err);
      return;
    }
    //файл записан успешно
  });

  //#endregion
  await browser.close();
})();

function compareImg(path1, path2, pathDiff) {
  fs.unlink(pathDiff, (err) => {
    // if (err) throw err;
    // console.log('Файл удален');
  });
  const img0 = PNG.sync.read(fs.readFileSync(path1));
  const img1 = PNG.sync.read(fs.readFileSync(path2));
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const result = pixelmatch(img0.data, img1.data, diff.data, width, height, {
    threshold: 0.2,
  });
  if (result > 10) {
    // console.log(`Different pixels: ${result}`);
    // send an email with the difference
    // or perform any other kind of logic
    fs.writeFileSync(pathDiff, PNG.sync.write(diff));
  } else {
    console.log("The screenshots are the same", path1, path2);
  }
}
