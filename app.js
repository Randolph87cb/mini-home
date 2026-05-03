const objectNotes = {
  sofa: {
    title: "沙发",
    body: "以后如果某一天都很累，也想和你一起窝在这里，把晚上的时间过得慢一点。",
  },
  lamp: {
    title: "台灯",
    body: "它像那种睡前还舍不得挂掉电话的光，安安静静地亮着，陪我们把一天收好。",
  },
  desk: {
    title: "小桌子",
    body: "这里适合放今天想到你的那一个瞬间，不用很重要，只要是真的想起了你。",
  },
  plant: {
    title: "植物",
    body: "关系有时候就像它，不需要催着长，只要有人一直在照看，就会慢慢变得很柔软。",
  },
};

const phoneMessages = [
  {
    date: "2026-05-04",
    body: "如果哪天你很晚才回来看这个小房间，也希望你会觉得，这里还有一盏灯是替你留着的。",
  },
  {
    date: "2026-05-02",
    body: "我想把电话留言做成一个认真一点的角落，留那些不想被一句话说完的心情。",
  },
  {
    date: "2026-04-29",
    body: "以后这里可以慢慢多一点共同布置的痕迹，但第一版只要先有温度就够了。",
  },
];

const titleElement = document.querySelector("#note-title");
const bodyElement = document.querySelector("#note-body");
const phoneSheet = document.querySelector("#phone-sheet");
const phoneListElement = document.querySelector("#phone-message-list");
const closePhoneButton = document.querySelector("#close-phone");
const hotspots = document.querySelectorAll("[data-note-id]");
const phoneButton = document.querySelector("[data-open-phone='true']");

function renderPhoneMessages() {
  phoneListElement.innerHTML = "";

  phoneMessages.forEach((message) => {
    const item = document.createElement("article");
    item.className = "phone-entry";
    item.innerHTML = `
      <time datetime="${message.date}">${message.date}</time>
      <p>${message.body}</p>
    `;
    phoneListElement.appendChild(item);
  });
}

function openObjectNote(noteId) {
  const note = objectNotes[noteId];

  if (!note) {
    return;
  }

  titleElement.textContent = note.title;
  bodyElement.textContent = note.body;
}

function openPhoneSheet() {
  phoneSheet.hidden = false;
  phoneSheet.classList.add("is-open");
  phoneSheet.setAttribute("aria-hidden", "false");
}

function closePhoneSheet() {
  phoneSheet.classList.remove("is-open");
  phoneSheet.setAttribute("aria-hidden", "true");
  phoneSheet.hidden = true;
}

hotspots.forEach((hotspot) => {
  hotspot.addEventListener("click", () => {
    openObjectNote(hotspot.dataset.noteId);
  });
});

phoneButton.addEventListener("click", openPhoneSheet);
closePhoneButton.addEventListener("click", closePhoneSheet);

phoneSheet.addEventListener("click", (event) => {
  if (event.target === phoneSheet) {
    closePhoneSheet();
  }
});

renderPhoneMessages();
