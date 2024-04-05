import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { LOCALES } from "./LocaleMap.js";
import { applyMenuTranslation, observeFactory } from "./MenuTranslate.js";
// Утилита перевода
export class TUtils {
  static LOCALE_ID = "AGL.Locale";
  static LOCALE_ID_LAST = "AGL.LocaleLast";

  static T = {
    Menu: {},
    Nodes: {},
    NodeCategory: {},
    Locales: LOCALES,
  };
  static ELS = {};

  static setLocale(locale) {
    localStorage[TUtils.LOCALE_ID_LAST] = localStorage.getItem(TUtils.LOCALE_ID) || "en-US";
    localStorage[TUtils.LOCALE_ID] = locale;
    setTimeout(() => {
      location.reload();
    }, 500);
  }

  static syncTranslation(OnFinished = () => {}) {
    var locale = localStorage.getItem(TUtils.LOCALE_ID) || "en-US";
    if (localStorage.getItem(TUtils.LOCALE_ID) === null) {
      // Возможно, в меню установлено значение ru-RU, но loacalStorage данные отсутствуют, поэтому оно переводиться не будет.
      let slocal = localStorage.getItem(`Comfy.Settings.${TUtils.LOCALE_ID}`);
      if (slocal) {
        locale = slocal.replace(/^"(.*)"$/, "$1");
      }
    }
    var url = "./agl/get_translation";
    var request = new XMLHttpRequest();
    request.open("post", url, false);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.onload = function () {
      /* Объект XHR получает ответ и выполняется */
      if (request.status != 200) return;
      var resp = JSON.parse(request.responseText);
      for (var key in TUtils.T) {
        if (key in resp) TUtils.T[key] = resp[key];
        else TUtils.T[key] = {};
      }
      TUtils.T.Locales = LOCALES;
      // Объединить NodeCategory в меню
      TUtils.Menu = Object.assign(TUtils.T.Menu, TUtils.T.NodeCategory);
      // Извлечение ключа из узла в меню
      for (let key in TUtils.T.Nodes) {
        let node = TUtils.T.Nodes[key];
        TUtils.Menu[key] = node["title"] || key;
      }
      OnFinished();
    };
    request.send(`locale=${locale}`);
  }
  static enhandeDrawNodeWidgets() {
    let theme = localStorage.getItem("Comfy.Settings.Comfy.ColorPalette") || "";
    theme = theme.replace(/^"(.*)"$/, "$1");
    if (!["dark", "light", "solarized", "arc", "nord", "github", ""].includes(theme)) return;
    let drawNodeWidgets = LGraphCanvas.prototype.drawNodeWidgets;
    LGraphCanvas.prototype.drawNodeWidgets = function (node, posY, ctx, active_widget) {
      if (!node.widgets || !node.widgets.length) {
        return 0;
      }
      const widgets = node.widgets.filter((w) => w.type === "slider");
      widgets.forEach((widget) => {
        widget._ori_label = widget.label;
        const fixed = widget.options.precision != null ? widget.options.precision : 3;
        widget.label = (widget.label || widget.name) + ": " + Number(widget.value).toFixed(fixed).toString();
      });
      let result;
      try {
        result = drawNodeWidgets.call(this, node, posY, ctx, active_widget);
      } finally {
        widgets.forEach((widget) => {
          widget.label = widget._ori_label;
          delete widget._ori_label;
        });
      }
      return result;
    };
  }
  static applyNodeTypeTranslationEx(nodeName) {
    let nodesT = this.T.Nodes;
    var nodeType = LiteGraph.registered_node_types[nodeName];
    let class_type = nodeType.comfyClass ? nodeType.comfyClass : nodeType.type;
    if (nodesT.hasOwnProperty(class_type)) {
      nodeType.title = nodesT[class_type]["title"] || nodeType.title;
    }
  }

  static applyNodeTypeTranslation(app) {
    for (let nodeName in LiteGraph.registered_node_types) {
      this.applyNodeTypeTranslationEx(nodeName);
    }
  }

  static applyNodeTranslation(node) {
    let keys = ["inputs", "outputs", "widgets"];
    let nodesT = this.T.Nodes;
    let class_type = node.constructor.comfyClass ? node.constructor.comfyClass : node.constructor.type;
    if (!nodesT.hasOwnProperty(class_type)) {
      for (let key of keys) {
        if (!node.hasOwnProperty(key)) continue;
        node[key].forEach((item) => {
          if (item?.hasOwnProperty("name")) item.label = item.name;
        });
      }
      return;
    }
    var t = nodesT[class_type];
    for (let key of keys) {
      if (!t.hasOwnProperty(key)) continue;
      if (!node.hasOwnProperty(key)) continue;
      node[key].forEach((item) => {
        if (item?.name in t[key]) {
          item.label = t[key][item.name];
        }
      });
    }
    if (t.hasOwnProperty("title")) {
      node.title = t["title"];
      node.constructor.title = t["title"];
    }
    // Обновление информации о сокете при преобразовании виджетов в input
    let addInput = node.addInput;
    node.addInput = function (name, type, extra_info) {
      var oldInputs = [];
      this.inputs?.forEach((i) => oldInputs.push(i.name));
      var res = addInput.apply(this, arguments);
      this.inputs?.forEach((i) => {
        if (oldInputs.includes(i.name)) return;
        if (t["widgets"] && i.widget?.name in t["widgets"]) {
          i.label = t["widgets"][i.widget?.name];
        }
      });
      return res;
    };
    let onInputAdded = node.onInputAdded;
    node.onInputAdded = function (slot) {
      if (onInputAdded) var res = onInputAdded.apply(this, arguments);
      // console.log(slot);
      let t = TUtils.T.Nodes[this.comfyClass];
      if (t["widgets"] && slot.name in t["widgets"]) {
        slot.label = t["widgets"][slot.name];
      }
      if (onInputAdded) return res;
    };
  }

  static applyMenuTranslation(app) {
    // Меню поиска
    applyMenuTranslation(TUtils.T);
    // Размер очереди
    observeFactory(app.ui.menuContainer.querySelector(".drag-handle").childNodes[1], (mutationsList, observer) => {
      for (let mutation of mutationsList) {
        for (let node of mutation.addedNodes) {
          var match = node.data.match(/(Queue size:) (\w+)/);
          if (match?.length == 3) {
            const t = TUtils.T.Menu[match[1]] ? TUtils.T.Menu[match[1]] : match[1];
            node.data = t + " " + match[2];
          }
        }
      }
    });
  }

  static applyContextMenuTranslation(app) {
    // Меню правой кнопки мыши
    var f = LGraphCanvas.prototype.getCanvasMenuOptions;
    LGraphCanvas.prototype.getCanvasMenuOptions = function () {
      var res = f.apply(this, arguments);
      let menuT = TUtils.T.Menu;
      for (let item of res) {
        if (item == null || !item.hasOwnProperty("content")) continue;
        if (item.content in menuT) {
          item.content = menuT[item.content];
        }
      }
      return res;
    };
    const f2 = LiteGraph.ContextMenu;
    LiteGraph.ContextMenu = function (values, options) {
      if (options.hasOwnProperty("title") && options.title in TUtils.T.Nodes) {
        options.title = TUtils.T.Nodes[options.title]["title"] || options.title;
      }
      // Конвертировать {w.name} в input
      // Конвертировать {w.name} в widget
      var t = TUtils.T.Menu;
      var reInput = /Convert (.*) to input/;
      var reWidget = /Convert (.*) to widget/;
      var cvt = t["Convert "] || "Convert ";
      var tinp = t[" to input"] || " to input";
      var twgt = t[" to widget"] || " to widget";
      for (let value of values) {
        if (value == null || !value.hasOwnProperty("content")) continue;
        // входа (inputs)
        if (value.content in t) {
          value.content = t[value.content];
          continue;
        }
        // виджеты и inputs
        var matchInput = value.content?.match(reInput);
        if (matchInput) {
          var match = matchInput[1];
          options.extra.inputs?.find((i) => {
            if (i.name != match) return false;
            match = i.label ? i.label : i.name;
          });
          options.extra.widgets?.find((i) => {
            if (i.name != match) return false;
            match = i.label ? i.label : i.name;
          });
          value.content = cvt + match + tinp;
          continue;
        }
        var matchWidget = value.content?.match(reWidget);
        if (matchWidget) {
          var match = matchWidget[1];
          options.extra.inputs?.find((i) => {
            if (i.name != match) return false;
            match = i.label ? i.label : i.name;
          });
          options.extra.widgets?.find((i) => {
            if (i.name != match) return false;
            match = i.label ? i.label : i.name;
          });
          value.content = cvt + match + twgt;
          continue;
        }
      }

      const ctx = f2.call(this, values, options);
      return ctx;
    };
    LiteGraph.ContextMenu.prototype = f2.prototype;
    // search box
    // var f3 = LiteGraph.LGraphCanvas.prototype.showSearchBox;
    // LiteGraph.LGraphCanvas.prototype.showSearchBox = function (event) {
    // 	var res = f3.apply(this, arguments);
    // 	var t = TUtils.T.Menu;
    // 	var name = this.search_box.querySelector(".name");
    // 	if (name.innerText in t)
    // 		name.innerText = t[name.innerText];
    // 	t = TUtils.T.Nodes;
    // 	var helper = this.search_box.querySelector(".helper");
    // 	var items = helper.getElementsByClassName("litegraph lite-search-item");
    // 	for (let item of items) {
    // 		if (item.innerText in t)
    // 			item.innerText = t[item.innerText]["title"];
    // 	}
    // 	return res;
    // };
    // LiteGraph.LGraphCanvas.prototype.showSearchBox.prototype = f3.prototype;
  }

  static addRegisterNodeDefCB(app) {
    const f = app.registerNodeDef;
    async function af() {
      return f.apply(this, arguments);
    }
    app.registerNodeDef = async function (nodeId, nodeData) {
      var res = af.apply(this, arguments);
      res.then(() => {
        TUtils.applyNodeTypeTranslationEx(nodeId);
      });
      return res;
    };
  }

  static addSettingsMenuOptions(app) {
    let id = this.LOCALE_ID;
    app.ui.settings.addSetting({
      id: id,
      name: "Locale",
      type: (name, setter, value) => {
        const options = [
          ...Object.entries(TUtils.T.Locales).map((v) => {
            let nativeName = v[1].nativeName;
            let englishName = "";
            if (v[1].englishName != nativeName) englishName = ` [${v[1].englishName}]`;
            return $el("option", {
              textContent: v[1].nativeName + englishName,
              value: v[0],
              selected: v[0] === value,
            });
          }),
        ];

        TUtils.ELS.select = $el(
          "select",
          {
            style: {
              marginBottom: "0.15rem",
              width: "100%",
            },
            onchange: (e) => {
              setter(e.target.value);
            },
          },
          options
        );

        return $el("tr", [
          $el("td", [
            $el("label", {
              for: id.replaceAll(".", "-"),
              textContent: "AGLTranslation-langualge",
            }),
          ]),
          $el("td", [
            TUtils.ELS.select,
            $el("div", {
              style: {
                display: "grid",
                gap: "4px",
                gridAutoFlow: "column",
              },
            }),
          ]),
        ]);
      },
      defaultValue: localStorage[id] || "en-US",
      async onChange(value) {
        if (!value) return;
        if (localStorage[id] != undefined && value != localStorage[id]) {
          TUtils.setLocale(value);
        }
        localStorage[id] = value;
      },
    });
  }
}

const ext = {
  name: "AIGODLIKE.Translation",
  async init(app) {
    // Любая начальная настройка (сразу после загрузки страницы)
    TUtils.enhandeDrawNodeWidgets();
    TUtils.syncTranslation();
    return;

    var f = app.graphToPrompt;
    app.graphToPrompt = async function () {
      var res = await f.apply(this, arguments);
      if (res.hasOwnProperty("workflow")) {
        for (let node of res.workflow.nodes) {
          if (node.inputs == undefined) continue;
          if (!(node.type in TRANSLATIONS && TRANSLATIONS[node.type].hasOwnProperty("inputs"))) continue;
          for (let input of node.inputs) {
            var t_inputs = TRANSLATIONS[node.type]["inputs"];
            for (let name in t_inputs) {
              if (input.name == t_inputs[name]) {
                input.name = name;
              }
            }
          }
        }
      }
      if (res.hasOwnProperty("output")) {
        for (let oname in res.output) {
          let o = res.output[oname];
          if (o.inputs == undefined) continue;
          if (!(o.class_type in TRANSLATIONS && TRANSLATIONS[o.class_type].hasOwnProperty("widgets"))) continue;

          var t_inputs = TRANSLATIONS[o.class_type]["widgets"];
          var rm_keys = [];
          for (let iname in o.inputs) {
            for (let name in t_inputs) {
              if (iname == name)
                // если нет перевода
                continue;
              if (iname == t_inputs[name]) {
                o.inputs[name] = o.inputs[iname];
                rm_keys.push(iname);
              }
            }
          }
          for (let rm_key of rm_keys) {
            delete o.inputs[rm_key];
          }
        }
      }
      return res;
    };
  },
  async setup(app) {
    TUtils.applyNodeTypeTranslation(app);
    TUtils.applyContextMenuTranslation(app);
    TUtils.applyMenuTranslation(app);
    TUtils.addRegisterNodeDefCB(app);
    TUtils.addSettingsMenuOptions(app);
    // Панель Settings
    // this.settings = new AGLSettingsDialog();
    // Добавить кнопку
    app.ui.menuContainer.appendChild(
      $el("button.agl-swlocale-btn", {
        id: "swlocale-button",
        textContent: TUtils.T.Menu["Switch Locale"] || "Switch Locale",
        onclick: () => {
          var localeLast = localStorage.getItem(TUtils.LOCALE_ID_LAST) || "en-US";
          var locale = localStorage.getItem(TUtils.LOCALE_ID) || "en-US";
          if (locale != "en-US" && localeLast != "en-US") localeLast = "en-US";
          if (locale != localeLast) {
            app.ui.settings.setSettingValue(TUtils.LOCALE_ID, localeLast);
          }
        },
      })
    );
  },
  async addCustomNodeDefs(defs, app) {
     // Добавляем пользовательские определения узлов
     // Будут настроены и зарегистрированы автоматически
     // defs — это поиск основных узлов, добавьте сюда свои
     // console.log("[logging]", "добавить пользовательские определения узлов", "текущие узлы:", Object.keys(defs));
  },
  async getCustomWidgets(app) {
     // Возвращаем пользовательские типы виджетов
     // См. ComfyWidgets для примеров виджетов
     // console.log("обеспечиваем пользовательские виджеты");
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // Запускаем пользовательскую логику до того, как определение узла будет зарегистрировано в графе
    // console.log("[logging]", "перед регистром узла: ", nodeType.comfyClass);
    // Это срабатывает для каждого определения узла, поэтому регистрируйтесь только один раз
    // applyNodeTranslationDef(nodeType, nodeData);
    // delete ext.beforeRegisterNodeDef;
  },
  async registerCustomNodes(app) {
    // Зарегистрируйте здесь любые реализации пользовательских узлов, обеспечивая большую гибкость, чем определение пользовательского узла
    // console.log("[logging]", "register custom nodes");
  },
  loadedGraphNode(node, app) {
     // Срабатывает для каждого узла при загрузке/перетаскивании/и т. д. воркфлоу в формате json или png
     // Если вы что-то сломали в бэкэнде и хотите исправить рабочие процессы во фронтенде
     // Это срабатывает для каждого узла при каждой загрузке, поэтому регистрируйтесь только один раз
     // delete ext.loadedGraphNode;
    TUtils.applyNodeTranslation(node);
  },
  nodeCreated(node, app) {
     // Срабатывает каждый раз, когда создается узел
     // Здесь вы можете изменять виджеты/добавлять обработчики/и т. д.
    TUtils.applyNodeTranslation(node);
  },
};

app.registerExtension(ext);
