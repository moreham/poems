const POEMS = [
  "春山如黛草如烟",
  "我今隐约欲何为",
  "应似飞鸿踏雪泥",
  "绿蚁新醅酒，红泥小火炉",
  "试玉要烧三日满",
  "忽如飞鸟栖枯枝",
  "昼短苦夜长，何不秉烛游",
  "何为自苦，使我心悲",
  "稻花香里说丰年",
  "人生长恨水长东",
  "长河渐落晓星沉",
  "上穷碧落下黄泉",
  "钿头银篦击节碎",
  "吴会非我乡，安得久留滞",
  "春江潮水连海平",
  "江月何年初照人",
  "羡长江之无穷",
  "有美一人，婉如清扬",
  "陛下临轩笑，左右咸欢康",
  "相恨不如潮有信",
  "终拟云间相逐飞",
  "几人同见太和春",
  "一剑霜寒十四州",
  "安得广厦千万间",
  "海棠虽好不吟诗",
  "吾不识青天高，黄地厚",
  "报君黄金台上意",
  "一点浩然气，千里快哉风",
  "回首叫，云飞风起",
  "醉里挑灯看剑",
  "白日放歌须纵酒",
  "人生自是有情痴",
  "蓬舟吹取三山去",
  "鲸饮未吞海，剑气已横秋",
  "莲花去国一千年",
  "应是良辰好景虚设",
  "春风得意马蹄疾",
  "关山难越，谁悲失路之人",
  "我见青山多妩媚",
  "对潇潇暮雨洒江天",
  "我与狸奴不出门",
  "赌书消得泼茶香",
  "云自无心水自闲",
  "飞光飞光，劝尔一杯酒",
  "曾是惊鸿照影来",
  "银鞍照白马，飒沓如流星",
  "兰陵美酒郁金香",
  "萧瑟秋风今又是，换了人间",
  "不破楼兰终不还",
  "硕鼠硕鼠，无食我黍",
  "岂曰无衣，与子同袍",
  "云无心以出岫",
  "春风不度玉门关",
  "柴门闻犬吠，风雪夜归人",
  "折戟沉沙铁未销",
  "不废江河万古流",
  "今宵酒醒何处",
  "金风玉露一相逢",
  "此时情绪此时天",
  "物是人非事事休",
  "至今思项羽，不肯过江东",
  "王师北定中原日",
  "二十四桥明月夜",
  "天下英雄谁敌手",
  "夫孰异道而相安",
  "东隅已逝，桑榆非晚",
  "相逢意气为君饮",
  "且将新火试新茶",
  "燕支长寒雪作花",
  "争渡，争渡，惊起一滩鸥鹭",
  "谁道人生无再少",
  "蓦然回首，那人却在，灯火阑珊处",
  "半江瑟瑟半江红",
  "料不啼清泪长啼血",
  "老夫聊发少年狂",
  "而不知太守之乐其乐也",
  "欲将心事付瑶琴",
  "明年此日青云去",
  "好风凭借力，送我上青云",
  "八千里路云和月",
  "忧从中来，不可断绝",
  "明月何曾是两乡",
  "一片冰心在玉壶",
  "忽见陌头杨柳色",
  "犹是春闺梦里人",
  "边庭飘飖那可度",
  "多少楼台烟雨中",
  "天光云影共徘徊",
  "鬓云欲度香腮雪",
  "林花谢了春红",
  "造化钟神秀，阴阳割昏晓",
  "横看成岭侧成峰",
  "九万里风鹏正举",
  "却道天凉好个秋",
  "山河表里潼关路",
  "今夕何夕兮，搴舟中流",
  "只愿君心似我心",
  "山无陵，天地合",
  "恨晨光之熹微",
  "天地不昭昭，大水不潦潦",
  "人生看得几清明",
  "江阔云低，断雁叫西风",
  "流光容易把人抛",
  "都道无人愁似我",
  "纵我不往，子宁不嗣音",
  "停云霭霭，时雨濛濛",
  "桃李春风一杯酒",
  "千山暮雪，只影向谁去",
  "晓看天色暮看云",
  "我以我血荐轩辕",
  "何时缚住苍龙",
  "遥想公瑾当年",
  "愿从今后八千年，长似今年",
  "寒光到处鬼神愁",
  "扶摇直上九万里",
  "天下谁人不识君",
  "功不唐捐，玉汝于成",
  "日月星辰任我攀",
  "旌旗十万斩阎罗",
  "苟利国家生死以",
  "竹杖芒鞋轻胜马",
  "苟非吾之所有，虽一毫而莫取",
  "三千越甲可吞吴",
  "乘骐骥以驰骋兮",
  "欲穷千里目，更上一层楼",
  "会当凌绝顶，一览众山小",
  "天地与我并生",
  "不才明主弃，多病故人疏",
  "正是江南好风景",
  "一年好景君须记",
  "旧时王谢堂前燕，飞入寻常百姓家",
  "汉将辞家破残贼",
  "平芜尽处是春山",
  "当年万里觅封侯",
  "春风又绿江南岸",
  "我本将心向明月",
  "此是千秋第一秋",
  "寂寞梧桐深院锁清秋",
  "此心安处是吾乡",
  "留取丹心照汗青",
  "千门万户曈曈日",
  "守岁筵开听颂椒",
  "海日生残夜，江春入旧年",
  "感时花溅泪，恨别鸟惊心",
  "沉舟侧畔千帆过",
  "长风破浪会有时",
  "任尔东西南北风",
  "日上三竿我独眠，谁是神仙，我是神仙",
  "前度刘郎今又来",
  "仰天大笑出门去",
  "老骥伏枥，志在千里",
  "相见时难别亦难",
  "收取关山五十州",
  "采菊东篱下，悠然见南山",
  "行到水穷处，坐看云起时",
  "非宁静无以致远",
  "后人哀之而不鉴之",
  "但使龙城飞将在",
  "明月松间照，清泉石上流",
  "天门中断楚江开",
  "平林漠漠烟如织",
  "唯见长江天际流",
  "大漠孤烟直，长河落日圆",
  "有乐且须乐，时哉不可失",
  "水善利万物而不争",
  "山雨欲来风满楼",
  "直把杭州作汴州",
  "花开堪折直须折",
  "安能摧眉折腰事权贵",
  "会挽雕弓如满月，西北望，射天狼",
  "凭谁问，廉颇老矣，尚能饭否",
  "身世浮沉雨打萍",
  "迟日江山丽，春风花草香",
  "乱花渐欲迷人眼",
  "春色满园关不住",
  "人生得意须尽欢",
  "随意春芳歇，王孙自可留",
  "忙趁东风放纸鸢",
  "水光潋滟晴方好",
  "久在樊笼里，复得返自然",
  "莫笑农家腊酒浑",
  "柳暗花明又一村",
  "不解藏踪迹，浮萍一道开",
  "花间一壶酒，独酌无相亲",
  "固知一死生为虚诞，齐彭殇为妄作",
  "苍山负雪，明烛天南",
  "我言秋日胜春朝",
  "醉卧沙场君莫笑",
  "美人帐下犹歌舞",
  "天生我材必有用",
  "石火光中寄此身",
  "以无厚入有间",
  "君子不器",
  "夏虫不可以语于冰者",
  "至人无己，神人无功，圣人无名",
  "人之性恶，其善者伪也",
  "怒而飞，其翼若垂天之云",
  "其视下也，亦若是则已矣",
  "儒以文乱法，侠以武犯禁",
  "天变不足畏，祖宗不足法，人言不足恤",
  "腾蛇游雾，飞龙乘云",
  "巧诈不如拙诚",
  "天下兼相爱则治，交相恶则乱",
  "不党父兄，不偏富贵，不嬖颜色",
  "野渡无人舟自横",
  "惟草木之零落兮",
  "伏清白以死直兮",
  "乐莫乐兮新相知",
  "云容容兮而在下",
  "何所独无芳草兮",
  "沧浪之水清兮",
  "沧浪之水浊兮",
  "大风起兮云飞扬",
  "力拔山兮气盖世",
  "生我者父母，知我者鲍子也",
  "大行不顾细谨",
  "居马上得之，宁可以马上治之乎",
  "乘人之车者载人之患",
  "多行不义必自毙",
  "国之利器，不可以假人",
  "仓廪实而知礼节",
  "天道盈而不溢，盛而不骄",
  "苟利众而百姓和",
  "风萧萧兮易水寒",
  "云想衣裳花想容",
  "能持剑向人，不解持照身",
  "疏影横斜水清浅",
  "仙人抚我顶，结发受长生",
  "月上柳梢头，人约黄昏后",
  "云青青兮欲雨",
  "杏花疏影里，吹笛到天明",
  "匣里金刀血未干",
  "深林人不知，明月来相照",
  "月下飞天镜，云生结海楼",
  "云横秦岭家何在",
  "蛰虫昭苏萌草出",
  "淮水东边旧时月",
  "洞庭春尽水如天",
  "大漠沙如雪，燕山月似钩",
  "心有灵犀一点通",
  "暮霭沉沉楚天阔",
  "拣尽寒枝不肯栖",
  "铁马秋风大散关",
  "三十年前，我是风流帅",
  "玉山自倒非人推",
  "涉江采芙蓉，兰泽多芳草",
  "惟解漫天作雪飞",
  "银瓶欲上丝绳绝",
  "秋月春风等闲度",
  "相逢何必曾相识",
  "可怜光彩生门户",
  "遇酒且呵呵，人生能几何",
  "一夜征人尽望乡",
  "我寄愁心与明月",
  "弦弦掩抑声声思",
  "此夜曲中闻折柳",
  "身外功名一任他",
  "多情却被无情恼",
  "致君尧舜上，再使风俗淳",
  "乘赤豹兮从文狸",
  "秦岭秋风我去时",
  "汴水流，泗水流，流到瓜洲古渡头",
  "花时同醉破春愁",
  "欸乃一声山水绿",
  "何须浅碧深红色",
  "佛狸祠下，一片神鸦社鼓",
  "但愿老死花酒间",
  "花钿委地无人收",
  "君王掩面救不得",
  "蜀江水碧蜀山青",
  "鸳鸯瓦冷霜华重",
  "为君一日恩，误妾百年身",
  "郎骑竹马来，绕床弄青梅",
  "常存抱柱信，岂上望夫台",
  "来如春梦几多时",
  "露似真珠月似弓",
  "日出江花红胜火，春来江水绿如蓝",
  "野火烧不尽，春风吹又生",
  "长恨春归无觅处",
  "行路难，不在水，不在山",
  "草萤有耀终非火",
  "彩云易散琉璃脆",
  "今我何功德？曾不事农桑",
  "红颜未老恩先断",
  "白首相知犹按剑",
  "朝承恩，暮赐死",
  "不问苍生问鬼神",
  "桃之夭夭，灼灼其华"
];

const verseElement = document.querySelector("#verse");
const cardElement = document.querySelector("#sign-card");
const drawButton = document.querySelector("#draw-button");

const interpretButton = document.querySelector("#interpret-button");
const frontFace = document.querySelector("#sign-front");
const backFace = document.querySelector("#sign-back");
const reading = document.querySelector("#reading");

const assistantButton = document.querySelector("#assistant-button");
const assistantDialog = document.querySelector("#assistant-dialog");
const assistantClose = document.querySelector("#assistant-close");
const assistantConfig = document.querySelector("#assistant-config");
const assistantConfigForm = document.querySelector("#assistant-config-form");
const assistantConfigCancel = document.querySelector("#assistant-config-cancel");
const assistantChat = document.querySelector("#assistant-chat");
const assistantEditConfig = document.querySelector("#assistant-edit-config");
const assistantClearConfig = document.querySelector("#assistant-clear-config");
const assistantEndpoint = document.querySelector("#assistant-endpoint");
const assistantApiKey = document.querySelector("#assistant-api-key");
const assistantModel = document.querySelector("#assistant-model");
const assistantRemember = document.querySelector("#assistant-remember");
const assistantKeyToggle = document.querySelector("#assistant-key-toggle");
const assistantPoemText = document.querySelector("#assistant-poem-text");
const assistantPoemSource = document.querySelector("#assistant-poem-source");
const assistantQuestion = document.querySelector("#assistant-question");
const assistantAnswer = document.querySelector("#assistant-answer");
const assistantAnswerContent = document.querySelector("#assistant-answer-content");
const assistantError = document.querySelector("#assistant-error");
const assistantSubmit = document.querySelector("#assistant-submit");

const AI_CONFIG_KEY = "poem-ai-config-v1";
let aiRequestController;
let volatileAIConfig;
let isFlipped = false;

function storageGet(storage) {
  try {
    const value = storage.getItem(AI_CONFIG_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (parsed?.endpoint && parsed?.apiKey && parsed?.model) return parsed;
  } catch (_) {
    // Storage can be unavailable in privacy modes; the form still works in memory.
  }
  return null;
}

function storageRemove(storage) {
  try {
    storage.removeItem(AI_CONFIG_KEY);
  } catch (_) {
    // Ignore unavailable storage and keep the current in-memory form values.
  }
}

function getAIConfig() {
  return storageGet(sessionStorage) || storageGet(localStorage) || volatileAIConfig || null;
}

function saveAIConfig(config, remember) {
  volatileAIConfig = config;
  storageRemove(sessionStorage);
  storageRemove(localStorage);
  try {
    (remember ? localStorage : sessionStorage).setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch (_) {
    // The populated form remains usable even when browser storage is blocked.
  }
}

function clearAIConfig() {
  volatileAIConfig = undefined;
  storageRemove(sessionStorage);
  storageRemove(localStorage);
  assistantConfigForm.reset();
  assistantApiKey.type = "password";
  assistantKeyToggle.textContent = "显示";
  assistantKeyToggle.setAttribute("aria-label", "显示 API 密钥");
  assistantKeyToggle.setAttribute("aria-pressed", "false");
  showAssistantConfig();
}

function populateConfigForm(config) {
  assistantEndpoint.value = config?.endpoint || "";
  assistantApiKey.value = config?.apiKey || "";
  assistantModel.value = config?.model || "";
  assistantRemember.checked = Boolean(storageGet(localStorage));
  assistantClearConfig.hidden = !config;
}

function showAssistantConfig() {
  const config = getAIConfig();
  populateConfigForm(config);
  assistantConfig.hidden = false;
  assistantChat.hidden = true;
  assistantConfigCancel.hidden = !config;
  window.setTimeout(() => assistantEndpoint.focus(), 0);
}

function showAssistantChat() {
  const config = getAIConfig();
  if (!config) {
    showAssistantConfig();
    return;
  }

  const poem = POEMS[currentIndex] || verseElement.getAttribute("aria-label") || "";
  const entry = INTERPRETATIONS[poem];
  assistantPoemText.textContent = poem;
  assistantPoemSource.textContent = entry ? `${entry.author}《${entry.title}》` : "";
  assistantConfig.hidden = true;
  assistantChat.hidden = false;
  assistantConfigCancel.hidden = false;
  window.setTimeout(() => assistantQuestion.focus(), 0);
}

function openAssistant() {
  if (!assistantDialog.open) assistantDialog.showModal();
  if (getAIConfig()) showAssistantChat();
  else showAssistantConfig();
}

function resetAssistantAnswer() {
  aiRequestController?.abort();
  aiRequestController = undefined;
  assistantQuestion.value = "";
  assistantAnswer.hidden = true;
  assistantAnswerContent.textContent = "";
  assistantError.hidden = true;
  assistantError.textContent = "";
  assistantSubmit.disabled = false;
  assistantSubmit.classList.remove("is-loading");
  const poem = POEMS[currentIndex] || verseElement.getAttribute("aria-label") || "";
  const entry = INTERPRETATIONS[poem];
  assistantPoemText.textContent = poem;
  assistantPoemSource.textContent = entry ? `${entry.author}《${entry.title}》` : "";
}

function setAssistantLoading(loading) {
  assistantSubmit.disabled = loading;
  assistantSubmit.classList.toggle("is-loading", loading);
  assistantSubmit.querySelector(".assistant-submit__loading").hidden = !loading;
}

function extractAIText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map(part => part?.text || part?.content || "").join("\n").trim();
  }
  if (typeof payload?.choices?.[0]?.text === "string") return payload.choices[0].text.trim();
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  return "";
}

function buildAIMessages(poem, question) {
  const entry = INTERPRETATIONS[poem] || {};
  const userQuestion = question || "请结合这支诗签，给我一段当下可实践的启发。";
  return [
    {
      role: "system",
      content: "你是一位谨慎、温和的中国古诗词文化解读助手。请依据给定诗句和出处进行解读，把诗签视为自我反思的引子，不声称预知命运，不制造恐惧或确定性结论。先说明诗句意象，再回应用户关切，最后给出2至3条具体、克制、可执行的建议。使用简体中文，控制在500字以内。若问题涉及医疗、法律、财务等高风险决定，应提醒用户咨询专业人士。"
    },
    {
      role: "user",
      content: [
        `诗签：${poem}`,
        `出处：${entry.author || "未知"}《${entry.title || "未知"}》`,
        `已有诗意资料：${entry.meaning || "暂无"}`,
        `用户所问：${userQuestion}`
      ].join("\n")
    }
  ];
}

async function requestAIInterpretation() {
  const config = getAIConfig();
  if (!config) {
    showAssistantConfig();
    return;
  }

  const poem = POEMS[currentIndex] || verseElement.getAttribute("aria-label") || "";
  assistantError.hidden = true;
  assistantAnswer.hidden = true;
  setAssistantLoading(true);
  aiRequestController?.abort();
  aiRequestController = new AbortController();

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: buildAIMessages(poem, assistantQuestion.value.trim())
      }),
      signal: aiRequestController.signal
    });

    let payload;
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      const apiMessage = payload?.error?.message || payload?.message;
      throw new Error(apiMessage || `接口返回 ${response.status}`);
    }

    const answer = extractAIText(payload);
    if (!answer) throw new Error("接口已响应，但没有返回可读取的文字内容。请确认它兼容聊天补全格式。");
    assistantAnswerContent.textContent = answer;
    assistantAnswer.hidden = false;
    assistantAnswer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    if (error.name === "AbortError") return;
    const networkHint = error instanceof TypeError
      ? "无法连接接口。请检查地址、网络，以及服务商是否允许浏览器跨域请求。"
      : error.message;
    assistantError.textContent = networkHint;
    assistantError.hidden = false;
  } finally {
    if (!aiRequestController?.signal.aborted) setAssistantLoading(false);
    aiRequestController = undefined;
  }
}

function setFlipped(flipped) {
  isFlipped = flipped;
  cardElement.classList.toggle("is-flipped", flipped);
  frontFace.inert = flipped;
  backFace.inert = !flipped;
  frontFace.setAttribute("aria-hidden", String(flipped));
  backFace.setAttribute("aria-hidden", String(!flipped));
  interpretButton.setAttribute("aria-expanded", String(flipped));
  interpretButton.textContent = flipped ? "返回签面" : "一键解读";
  if (flipped) reading.scrollTop = 0;
}

function renderInterpretation(text) {
  const entry = INTERPRETATIONS[text];
  interpretButton.disabled = !entry;
  for (const field of ["title", "author", "meaning", "original"]) {
    document.querySelector(`#reading-${field}`).textContent = entry?.[field] || "";
  }
  document.querySelector("#reading-original-label").textContent = entry?.excerpt ? "原文（节选）" : "原文";
  const source = document.querySelector("#reading-source");
  source.hidden = !entry?.url;
  if (entry?.url) source.href = entry.url;
  else source.removeAttribute("href");
  reading.scrollTop = 0;
}

let currentIndex = -1;
let drawingTimer;

function secureRandomIndex(max) {
  if (globalThis.crypto?.getRandomValues) {
    const maxUint = 0x100000000;
    const limit = maxUint - (maxUint % max);
    const values = new Uint32Array(1);
    do {
      globalThis.crypto.getRandomValues(values);
    } while (values[0] >= limit);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function pickPoemIndex() {
  if (POEMS.length < 2) return 0;

  let nextIndex;
  do {
    nextIndex = secureRandomIndex(POEMS.length);
  } while (nextIndex === currentIndex);

  return nextIndex;
}

function splitAtChineseCommas(text) {
  const segments = [];
  let buffer = "";

  for (const character of text) {
    buffer += character;
    if (character === "，") {
      segments.push(buffer);
      buffer = "";
    }
  }

  if (buffer) segments.push(buffer);
  return segments;
}

function renderPoem(text) {
  verseElement.replaceChildren();
  let characterIndex = 0;

  splitAtChineseCommas(text).forEach((segment) => {
    const column = document.createElement("span");
    column.className = "verse__column";

    for (const character of segment) {
      const characterElement = document.createElement("span");
      characterElement.className = "verse__char";
      characterElement.style.setProperty("--char-index", characterIndex);
      characterElement.textContent = character;
      column.append(characterElement);
      characterIndex += 1;
    }

    verseElement.append(column);
  });

  verseElement.setAttribute("aria-label", text);
  fitVerse();
  renderInterpretation(text);
  window.dispatchEvent(new CustomEvent("poemchange", { detail: text }));
}

// Allow generous glyph cells while keeping every complete verse on the paper.
function fitVerse() {
  const columns = [...verseElement.children];
  if (!columns.length) return;
  const longest = Math.max(...columns.map(column => column.children.length));
  const gap = parseFloat(getComputedStyle(verseElement).columnGap) || 0;
  const fontSize = Math.min(
    35,
    Math.max(27, window.innerWidth * 0.074),
    verseElement.clientHeight / (longest * 1.3),
    (verseElement.clientWidth - gap * (columns.length - 1)) / (columns.length * 1.3)
  );
  verseElement.style.fontSize = `${Math.floor(fontSize * 100) / 100}px`;
}

function drawPoem({ initial = false } = {}) {
  window.clearTimeout(drawingTimer);
  currentIndex = pickPoemIndex();
  resetAssistantAnswer();
  drawButton.disabled = true;
  cardElement.classList.add("is-resetting");
  setFlipped(false);
  cardElement.classList.remove("is-drawing");
  void cardElement.offsetWidth;
  if (!initial) cardElement.classList.add("is-drawing");
  renderPoem(POEMS[currentIndex]);
  interpretButton.disabled = true;
  void cardElement.offsetWidth;
  cardElement.classList.remove("is-resetting");

  drawingTimer = window.setTimeout(() => {
    drawButton.disabled = false;
    interpretButton.disabled = !INTERPRETATIONS[POEMS[currentIndex]];
    cardElement.classList.remove("is-drawing");
  }, 620);
}

interpretButton.addEventListener("click", () => setFlipped(!isFlipped));
assistantButton.addEventListener("click", openAssistant);
assistantClose.addEventListener("click", () => assistantDialog.close());
assistantDialog.addEventListener("click", event => {
  if (event.target === assistantDialog) assistantDialog.close();
});
assistantEditConfig.addEventListener("click", showAssistantConfig);
assistantConfigCancel.addEventListener("click", showAssistantChat);
assistantClearConfig.addEventListener("click", clearAIConfig);
assistantKeyToggle.addEventListener("click", () => {
  const willShow = assistantApiKey.type === "password";
  assistantApiKey.type = willShow ? "text" : "password";
  assistantKeyToggle.textContent = willShow ? "隐藏" : "显示";
  assistantKeyToggle.setAttribute("aria-label", willShow ? "隐藏 API 密钥" : "显示 API 密钥");
  assistantKeyToggle.setAttribute("aria-pressed", String(willShow));
});
assistantConfigForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!assistantConfigForm.reportValidity()) return;

  const endpoint = assistantEndpoint.value.trim();
  let endpointURL;
  try {
    endpointURL = new URL(endpoint);
  } catch (_) {
    assistantEndpoint.setCustomValidity("请输入完整的接口地址。");
    assistantEndpoint.reportValidity();
    return;
  }

  if (!/^https?:$/.test(endpointURL.protocol)) {
    assistantEndpoint.setCustomValidity("接口地址必须以 http:// 或 https:// 开头。");
    assistantEndpoint.reportValidity();
    return;
  }

  assistantEndpoint.setCustomValidity("");
  saveAIConfig({
    endpoint,
    apiKey: assistantApiKey.value.trim(),
    model: assistantModel.value.trim()
  }, assistantRemember.checked);
  showAssistantChat();
});
assistantEndpoint.addEventListener("input", () => assistantEndpoint.setCustomValidity(""));
assistantSubmit.addEventListener("click", requestAIInterpretation);
reading.addEventListener("keydown", event => {
  if (event.key === "Escape" && isFlipped) {
    setFlipped(false);
    interpretButton.focus();
  }
});
drawButton.addEventListener("click", () => drawPoem());
drawPoem({ initial: true });

window.addEventListener("resize", fitVerse);
if (document.fonts) document.fonts.ready.then(fitVerse);
if ("ResizeObserver" in window) new ResizeObserver(fitVerse).observe(verseElement);
