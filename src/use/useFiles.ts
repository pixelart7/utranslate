
import { Buffer } from 'buffer';
import { ref, Ref, onMounted } from '@vue/composition-api';

type FileJSON = {
  header: string;
  footer: string;
  originalSize: number;
  wordPairs: {
    next: number;
    key: string;
    word: string;
    encoding: string;
    position: {
      from: number;
      to: number;
    };
    size: {
      key: number;
      word: number;
      tail: number;
      total: number;
    };
    wordText: string;
    keyText: string;
  }[];
};

function littleEndian(string: string) { return (string.match(/.{2}/g) || ['']).reverse().join(''); }
function toInt(buffer: Buffer, parseFunction: (string: string) => string) { return parseInt(parseFunction(buffer.toString('hex')), 16); }

function get(buffer: Buffer, length: number, subOffset: number) {
  const smallBuffer = buffer.slice(subOffset, subOffset + length);
  return {
    next: subOffset + length,
    buffer: smallBuffer,
  };
}

function wordPairReader(buffer: Buffer, fileOffset: number) {
  const result = {
    next: 0,
    key: '',
    word: '',
    encoding: '',
    position: {
      from: fileOffset,
      to: 0, // exclusive
    },
    size: {
      key: 0,
      word: 0,
      tail: 0,
      total: 0,
    },
  };

  let output;
  output = get(buffer, 4, fileOffset); // key length
  result.size.key = toInt(output.buffer, littleEndian);
  output = get(buffer, toInt(output.buffer, littleEndian), output.next); // key value
  result.key = output.buffer.toString('hex');

  output = get(buffer, 4, output.next); // word length raw
  let wordLength = toInt(output.buffer, littleEndian); // assume ascii
  result.encoding = 'ascii';
  if (toInt(output.buffer, littleEndian) > 2147483647) {
    // as unicode
    wordLength = (0xFFFFFFFF - toInt(output.buffer, littleEndian)) * 2; // * 2 as unicode
    result.encoding = 'unicode';
  }
  result.size.word = wordLength;
  output = get(buffer, wordLength, output.next);
  result.word = output.buffer.toString('hex');

  let tailCheck = 0;
  let nextFromTail = 0;
  while (tailCheck === 0) {
    output = get(buffer, 1, output.next); // eslint-disable-line
    tailCheck = toInt(output.buffer, littleEndian);
    nextFromTail = output.next;
    result.size.tail += 1;
  }
  result.size.tail -= 1; // while loop finished with additional one byte
  result.next = nextFromTail - 1; // while loop finished with additional one byte
  result.size.total = 4 + result.size.key + 4 + result.size.word + result.size.tail;

  result.position.to = output.next;

  return result;
}

function uassetToObject(buffer: Buffer, offset: number) {
  const bytesOffsetToFirstValue = offset;

  const size = buffer.length;
  const header = get(buffer, bytesOffsetToFirstValue, 0);

  let footer = {} as { next: number; buffer: Buffer };
  const wordPairs = [];
  let next = bytesOffsetToFirstValue;
  try {
    while (next < size) {
      const res = wordPairReader(buffer, next);
      next = res.next;
      wordPairs.push(res);
    }
  } catch (e) {
    console.log('File read should successfully finished.');
  }
  wordPairs.pop();
  footer = get(buffer, (size - wordPairs[wordPairs.length - 1].position.to) + 1, wordPairs[wordPairs.length - 1].position.to - 1); // eslint-disable-line

  const convert = (from: string, to: string) => (str: string) => Buffer.from(str, from).toString(to); // eslint-disable-line
  const toAscii = convert('hex', 'ascii');
  const toUnicode = convert('hex', 'utf16le');
  wordPairs.map((pair) => {
    type NewPair = typeof pair & { keyText?: string; wordText?: string };
    const newObj: NewPair = pair;
    newObj.keyText = toAscii(pair.key);
    if (pair.encoding === 'ascii') newObj.wordText = toAscii(pair.word);
    else newObj.wordText = toUnicode(pair.word);
    return newObj;
  });

  const output = {
    header: header.buffer.toString('hex'),
    footer: footer.buffer.toString('hex'),
    originalSize: size,
    wordPairs,
  };

  let checkWordPairsSize = 0;
  wordPairs.forEach((elm) => {
    checkWordPairsSize += (elm.key.length / 2) + (elm.word.length / 2) + 4 + 4 + (elm.size.tail);
  });
  const crossCheckSize = (output.header.length / 2) + (output.footer.length / 2) + checkWordPairsSize; // eslint-disable-line

  console.log('Output size validation:', (crossCheckSize === output.originalSize) ? 'passed' : 'failed'); // eslint-disable-line

  return output;
}

function toBuffer(number: number, length: number) {
  const arr = new ArrayBuffer(length);
  const view = new DataView(arr);
  // const arr2 = new ArrayBuffer(length);
  // const view2 = new DataView(arr2);
  view.setUint8(0, number);
  view.setUint8(1, number >> 8); // eslint-disable-line
  view.setUint8(2, number >> 16); // eslint-disable-line
  view.setUint8(3, number >> 24); // eslint-disable-line
  // console.log(Buffer.from(arr2).toString('hex'));
  // view.setUint8(0, number);
  return Buffer.from(arr);
}

// result.encoding = 'ascii';
// if (toInt(output.buffer, littleEndian) > 2147483647) {
//   // as unicode
//   wordLength = (0xFFFFFFFF - toInt(output.buffer, littleEndian)) * 2; // * 2 as unicode
//   result.encoding = 'unicode';
// }

// wordLengthInFile = 0xFFFFFFFF - (normalizedWordLength / 2);

function objectToUasset(jsonObject: FileJSON) {
  let result = '';
  result = `${jsonObject.header}`;
  jsonObject.wordPairs.forEach((elm) => {
    const keyBuff = Buffer.from(elm.key, 'hex');
    const keyLength = toBuffer(keyBuff.length, 4);
    const wordBuff = Buffer.from(elm.word, 'hex');
    let wordLength = toBuffer(wordBuff.length, 4); // assume ascii
    let tail = '';
    if (elm.encoding === 'unicode') {
      wordLength = toBuffer((0xFFFFFFFF) - (wordBuff.length / 2), 4);
      tail = '0000';
    }
    result = `${result}${keyLength.toString('hex')}${keyBuff.toString('hex')}${wordLength.toString('hex')}${wordBuff.toString('hex')}${tail}`; // eslint-disable-line
  });
  result = `${result}00000000${jsonObject.footer}`;
  return result;
}

export default function useFiles() {
  const list: Ref<string[]> = ref([]);

  function refreshList() {
    const files = Object.keys(localStorage).filter((key) => key.startsWith('utranslate-file-')).map((key) => key.replace('utranslate-file-', ''));
    list.value = files;
  }

  function importFile(file: File) {
    return new Promise((res, rej) => {
      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = () => {
        console.log(fileReader.result);
        const buffer = Buffer.from(fileReader.result as ArrayBuffer);
        // console.log(buffer);
        const localStorageKey = `utranslate-file-${file.name}`;
        localStorage.setItem(localStorageKey, buffer.toString('hex'));
        // const result = uassetToObject(buffer, 602);
        res(localStorageKey);
        refreshList();
      };
    });
  }

  onMounted(() => { refreshList(); });

  function downloadFile(body: ArrayBuffer, filename: string) {
    const blob = new Blob([body]);
    const fileName = filename;
    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      // Browsers that support HTML5 download attribute
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  return {
    importFile,
    downloadFile,
    getFile: (fsKey: string) => localStorage.getItem(fsKey) as string,
    hasFile: (fsKey: string) => localStorage.getItem(fsKey) || false,
    saveFile: (fsKey: string, value: string) => localStorage.setItem(fsKey, value),
    refreshList,
    list,
    parser: {
      uasset: uassetToObject,
    },
    converter: {
      uasset: objectToUasset,
    },
  };
}
