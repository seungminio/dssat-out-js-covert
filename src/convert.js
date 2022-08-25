import fs from "fs/promises";

import moment from "moment";

import removeStringTrim from "./utils/removeStringTrim.js";
import convertStringToSnakeCase from "./utils/convertStringToSnakeCase.js";

export default async ({ outFilePath, saveDirPath }) => {
  const data = await fs.readFile(outFilePath, "utf8");

  const SECTION_DATA_STRING = data.split(`\n`)[2];

  let isBeforeNotSpecialCharacter = false;
  let startIndex = 0;
  let tempKey = "";
  let lastCharacter = "";

  const resetTempCharacterData = () => {
    isBeforeNotSpecialCharacter = false;
    startIndex = 0;
    tempKey = "";
    lastCharacter = "";
  };

  const SECTION_DATA_RESULT = Array.from(SECTION_DATA_STRING).reduce(
    (acc, character, i) => {
      if (isBeforeNotSpecialCharacter) {
        acc.push({
          startIndex,
          endIndex: i - 1,
          key: tempKey,
        });
        isBeforeNotSpecialCharacter = false;
        startIndex = i;
        tempKey = "";
      }

      tempKey += character;

      if (lastCharacter === "." && character === " ") {
        isBeforeNotSpecialCharacter = true;
      }

      lastCharacter = character;

      if (SECTION_DATA_STRING.length - 1 === i) {
        acc.push({
          startIndex,
          endIndex: i + 1,
          key: tempKey,
        });
        resetTempCharacterData();
      }

      return acc;
    },
    []
  );

  const DETAIL_DATA_KEY_STRING = data.split(`\n`)[3];

  const DETAIL_DATA_KEY_RESULT_TEMP = Array.from(DETAIL_DATA_KEY_STRING)
    .reduce((acc, character, i) => {
      if (isBeforeNotSpecialCharacter) {
        acc.push({
          startIndex,
          endIndex: i,
          key: tempKey,
        });
        isBeforeNotSpecialCharacter = false;
        startIndex = i;
        tempKey = "";
      }

      tempKey += character;

      if (
        [".", " "].includes(lastCharacter) &&
        [".", " "].includes(character)
      ) {
        isBeforeNotSpecialCharacter = true;
      } else if (" " === character) {
        isBeforeNotSpecialCharacter = true;
      }

      lastCharacter = character;

      if (SECTION_DATA_STRING.length - 1 === i) {
        acc.push({
          startIndex,
          endIndex: i + 1,
          key: tempKey,
        });
        resetTempCharacterData();
      }

      return acc;
    }, [])
    .filter((v) => ![" ", "."].includes(v.key));

  const DETAIL_DATA_KEY_RESULT = DETAIL_DATA_KEY_RESULT_TEMP.map((v, i) => {
    return {
      ...v,
      endIndex:
        i === DETAIL_DATA_KEY_RESULT_TEMP.length - 1
          ? v.endIndex
          : DETAIL_DATA_KEY_RESULT_TEMP[i + 1].startIndex - 1,
    };
  });

  const INTERFACE_GUIDE_DATA = SECTION_DATA_RESULT.map((section) => {
    const section_detail_keys = DETAIL_DATA_KEY_RESULT.filter(
      (v) =>
        section.startIndex <= v.startIndex && section.endIndex >= v.endIndex
    );
    return { ...section, section_detail_keys };
  });

  const DETAIL_DATA_VALUE_STRING = data.split(`\n`).slice(4);

  const result = DETAIL_DATA_VALUE_STRING.map((valueString) => {
    const data = INTERFACE_GUIDE_DATA.map((section) => {
      return {
        section: section.key,
        data: section.section_detail_keys.reduce((acc, crr, index) => {
          const key = convertStringToSnakeCase(crr.key);
          const value = removeStringTrim(
            valueString.slice(crr.startIndex, crr.endIndex)
          );

          acc[key] = parseFloat(value) || value;
          return acc;
        }, {}),
      };
    });

    return data.reduce((acc, crr, index) => {
      acc[convertStringToSnakeCase(crr.section)] = crr.data;
      return acc;
    }, {});
  });

  await fs.mkdir(saveDirPath, { recursive: true });

  await fs.writeFile(
    `${saveDirPath}/${moment().format("YYYY-MM-DD_HH:mm:ss")}-output.json`,
    JSON.stringify(result, null, 2)
  );

  return result;
};
