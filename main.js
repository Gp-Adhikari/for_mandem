//start puppeteer
const puppeteer = require("puppeteer");
const fs = require("fs");

const searchString = "Chat app description";

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); //disable timeout

    console.log(`
    ===============================================================================
    |   Working on it... It may take a while depending on your internet speed.    |
    ===============================================================================
    `);

    //create files folder if not exists
    if (!fs.existsSync("./files")) {
      fs.mkdirSync("./files");
    }

    //go to google
    await page.goto("https://www.google.com/");

    await page.type("input[name=q]", searchString);
    await page.keyboard.press("Enter");

    await page.waitForNavigation();

    //get all links on page without google as string in them
    const links = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a")).filter(
        (link) =>
          link.href.includes("google") === false && link.href.length !== 0
      );
      return links.map((link) => link.href);
    });

    for (let i = 0; i < links.length; i++) {
      await page.goto(links[i], { waitUntil: "load" });

      //get all buttons
      const buttons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.map((button) => button.innerText);
      });

      //check if the buttons text includes "cookie"
      const cookieButton = buttons.find((button) => button.includes("cookie"));
      if (cookieButton) {
        //click cookie button
        await page.click(`button:contains("${cookieButton}")`);
      }

      //check if the body contains p tag
      const pTag = await page.evaluate(() => {
        const pTag = document.querySelector("p");
        return pTag;
      });

      //if p tag doesnt exist, continue the loop
      if (!pTag || pTag === null) {
        console.log(`
      -------------------------------
      |    Problem with task ${i + 1}.     |
      -------------------------------
      `);
        continue;
      }

      //get all text on page
      const text = await page.evaluate(() => {
        const text = Array.from(document.querySelectorAll("p")).map(
          (p) => p.innerText
        );
        return text;
      });

      //combine arrary to string with new line

      let filteredText = text.filter(
        (text) =>
          text.length !== 0 &&
          text.includes("copyright") === false &&
          text.includes("cookie") === false &&
          text.includes("privacy") === false &&
          text.includes("terms") === false &&
          text.includes("policy") === false &&
          text.includes("©") === false
      );

      filteredText = [await page[i], ...filteredText];

      const textString = filteredText.join("\n");

      //new line after fullstop to textString
      const textStringWithNewLine = textString.replace(/\./g, ".\n");

      //get page title with 10 characters
      const title = await page.title();
      let titleWith10Characters = "";

      //remove special characters from title
      const titleWithoutSpecialCharacters = title.replace(/[^a-zA-Z0-9 ]/g, "");

      //remove spaces from title
      const titleWithoutSpaces = titleWithoutSpecialCharacters.replace(
        / /g,
        ""
      );

      if (titleWithoutSpaces.length > 15) {
        titleWith10Characters = await titleWithoutSpaces.substring(0, 15);
      } else {
        titleWith10Characters = await titleWithoutSpaces;
      }

      //write to file
      fs.writeFileSync(
        `./files/${await titleWith10Characters}.docx`,
        textStringWithNewLine,
        (err) => {
          console.log(err);
        }
      );

      console.log(`
      -------------------------------
      |    ${i + 1} finished, ${links.length - (i + 1)} to go     |
      -------------------------------
      `);
    }

    await browser.close();
    console.log(`
    ===============================================================
    |     Task Completed. Open the "files" folder/directory :)    |
    ===============================================================
    `);
  } catch (err) {
    console.log(err);
  }
})();
