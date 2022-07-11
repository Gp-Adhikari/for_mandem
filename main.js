//start puppeteer
const puppeteer = require("puppeteer");
const fs = require("fs");
const pptxgen = require("pptxgenjs");

//built in modules
const cluster = require("cluster");

const searchString = "software development life cyclels";

//number of cpus
const numCpu = 1;

//if the cluster is master // multi-process thread pool - current thread = 1 for deling with errors
if (cluster.isMaster) {
  for (let i = 0; i < numCpu; i++) {
    cluster.fork();
  }

  //if worker dies or is killed
  cluster.on("exit", (worker, code, signal) => {
    cluster.fork();
  });
} else {
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
            link.href.includes("google") === false &&
            link.href.length !== 0 &&
            link.href.includes("youtube") === false
        );
        return links.map((link) => link.href);
      });

      for (let i = 0; i < links.length; i++) {
        // for (let i = 0; i < 1; i++) {
        try {
          await page.goto(links[i], { waitUntil: "load" });

          //get all buttons
          const buttons = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll("button"));
            return buttons.map((button) => button.innerText);
          });

          //check if the buttons text includes "cookie"
          const cookieButton = buttons.find((button) =>
            button.includes("cookie")
          );
          if (cookieButton) {
            //click cookie button
            await page.click(`button:contains("${cookieButton}")`);
          }

          const pTag = await page.evaluate(() => {
            //get only p tage and remove p tag from nav, header, footer and also if the class is nav, header, footer
            const pTags = Array.from(document.querySelectorAll("p")).filter(
              (p) =>
                p.innerText !== undefined &&
                p.innerText.length > 0 &&
                p.innerText.split(" ").length > 2 &&
                p.innerText.includes("nav") === false &&
                p.innerText.includes("header") === false &&
                p.innerText.includes("footer") === false &&
                p.className !== "nav" &&
                p.className !== "header" &&
                p.className !== "footer" &&
                p.parentElement.tagName !== "NAV" &&
                p.parentElement.tagName !== "HEADER" &&
                p.parentElement.tagName !== "FOOTER"
            );

            //remove p tag containing on only one word
            const pTagsFiltered = pTags.filter((p) => {
              const pText = p.innerText.split(" ");
              return pText.length > 3;
            });

            return pTagsFiltered.map((p) => p.innerText);
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
          const titleWithoutSpecialCharacters = title.replace(
            /[^a-zA-Z0-9 ]/g,
            ""
          );

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
        } catch (err) {
          console.log(err);
        }
      }

      await browser.close();

      //combine all files text in one string
      const files = fs.readdirSync("./files");
      let text = "";
      for (let i = 0; i < files.length; i++) {
        text += fs.readFileSync(`./files/${files[i]}`, "utf8");
      }

      //text array with new line after fullstop and remove sentences less than 20 characters
      const textArray = text.split("\n");

      const textArrayWithNewLineFiltered = textArray.filter(
        (text) => text !== undefined && text.length > 30
      );

      //create pptx file
      let pres = new pptxgen();

      //create silde and add 10 lines on each slide
      for (let i = 0; i < textArrayWithNewLineFiltered.length; i += 6) {
        let slide = pres.addSlide();
        let text = ``;
        for (let j = 0; j < 10; j++) {
          if (textArrayWithNewLineFiltered[i + j] === undefined) {
            continue;
          }

          //if the text contains question mark, create new line
          if (textArrayWithNewLineFiltered[i + j].includes("?")) {
            text += `\n${textArrayWithNewLineFiltered[i + j]}\n`;
          } else {
            text += ` ${textArrayWithNewLineFiltered[i + j]}`;
          }
        }
        //add text to slide and create new line after fullstop
        slide.addText(text, {
          x: 0.0,
          y: 0.25,
          w: "100%",
          h: "100%",
          fontSize: 16,
          color: "000000",
        });
      }

      //save pptx file
      pres.writeFile({ fileName: "presentation.pptx" });

      console.log(`
    ===============================================================
    |     Task Completed. Open the "files" folder/directory :)    |
    ===============================================================
    `);
    } catch (err) {
      console.log(err);
    }
  })();
}
