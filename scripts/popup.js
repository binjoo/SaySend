$(function () {
  let imageFile = null
  var timeout = null
  const tip = (msg, duration, callback) => {
    $(".tip-wrap").remove()
    if (timeout) {
      clearTimeout(timeout)
    }
    html = '<div class="tip-wrap"><div class="tip-content">'
    html += msg
    html += '</div></div>'
    $("body").append(html)
    $(".tip-wrap").hide().fadeIn(200, () => {
      timeout = setTimeout(() => {
        $(".tip-wrap").fadeOut(200, () => {
          $(".tip-wrap").remove()
        })
        if (duration instanceof Function) {
          duration()
        }
        if (callback instanceof Function) {
          callback()
        }
      }, duration instanceof Number ? duration : 2600)
    })
  }

  $('button.btn-setting').on('click', () => {
    $(".panel-setting button.btn-save").prop("disabled", false);
    chrome.storage.local.get(["api_url"], (result) => {
      $("input.ipt-apiUrl").val(result.api_url)
    })
    $("div.panel-setting.panel-setting .form-group").removeClass("has-success has-error");
    $("div.panel-setting").slideToggle()
  })

  // 显示标签面板
  $("button.btn-select-tags").on("click", (e) => {
    if ($("div.panel-tags").is(":hidden")) {
      chrome.storage.local.get(["tags"], (result) => {
        $(".panel-tags").html("");
        if (result.tags && result.tags.length > 0) {
          let tags = result.tags;
          let max = tags.length - 1;
          for (var j = 0; j < max; j++) {
            var done = true;
            for (var i = 0; i < max - j; i++) {
              if (tags[i].cnt > tags[i + 1].cnt) {
                var temp = tags[i];
                tags[i] = tags[i + 1];
                tags[i + 1] = temp;
                done = false;
              }
            }
            if (done) {
              break;
            }
          }
          tags.reverse();
          tags.forEach(tag => {
            $(".panel-tags").append(
              $("<span></span>", {
                "class": "chip c-hand",
                "data-val": tag.name,
                "text": tag.name
              }).append(
                $("<a></a>", {
                  "href": "#",
                  "class": "btn btn-clear",
                  "aria-label": "Close",
                  "role": "button"
                })
              )
            )
          });
        } else {
          $(".panel-tags").append(
            $("<div></div>", {
              "class": "column col-12 mx-2 my-2 text-center text-muted text-tiny",
              "text": "暂无标签"
            })
          )
        }
      })
    }
    $("div.panel-tags").slideToggle("fast");
  })

  // 标签选择
  $(".panel-tags").on("click", " .chip", (e) => {
    if ($(e.target).hasClass("chip")) {
      message.insertAtCaret($("textarea[name=text]")[0], "#" + $(e.target).data("val") + " ");
    } else {
      let val = $(e.target).parent().data("val");
      chrome.storage.local.get(["tags"], (result) => {
        for (let i in result.tags) {
          if (result.tags[i].name === val) {
            result.tags.splice(i, 1);
            chrome.storage.local.set({
              "tags": result.tags
            })
            break;
          }
        }
        $(e.target).parents("span.chip").remove()

        if ($(".panel-tags span.chip").length <= 0) {
          $(".panel-tags").append(
            $("<div></div>", {
              "class": "column col-12 mx-2 my-2 text-center text-muted text-tiny",
              "text": "暂无标签"
            })
          )
        }
      })
    }
  })

  // 选择图片
  $("button.btn-select-image").on("click", (e) => {
    $("input.ipt-hidden-file").click();
  })

  // 选择图片展示base64
  $("input.ipt-hidden-file").on("change", (e) => {
    if (e.target.files && e.target.files.length >= 1) {
      var reader = new FileReader()
      reader.onload = function (event) {
        insertImage(event.target.result, e.target.files[0])
      }
      reader.readAsDataURL(e.target.files[0]);
    }
  })

  // 文本框粘贴图片
  $("textarea[name=text]").on("paste", (e) => {
    const eventData = e.originalEvent;
    var items = eventData.clipboardData && eventData.clipboardData.items;
    var file = null;
    if (items && items.length) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          file = items[i].getAsFile();
          var reader = new FileReader()
          reader.onload = function (event) {
            chrome.storage.local.get(["beta"], (result) => {
              if (result.beta !== "enable") {
                return
              }
              insertImage(event.target.result, file)
            })
          }
          reader.readAsDataURL(file);
        }
      }
    }
  }).on('select', () => {
    message.setCaret(this);
  }).on('click', () => {
    message.setCaret(this);
  }).on('keyup', () => {
    message.setCaret(this);
  });

  // 分享位置
  $("button.btn-select-location").on("click", (e) => {
    $("button.btn-select-location").addClass("disabled");
    if ($("input.ipt-hidden-location").is(":checked")) {
      chrome.storage.local.set({
        "location": "disable"
      }, () => {
        $("input.ipt-hidden-location").prop("checked", false);
        $("button.btn-select-location").removeClass("checked");
      })
    } else {
      initLocation(() => {
        tip("开启分享位置成功...");
        $("input.ipt-hidden-location").prop("checked", true);
        $("button.btn-select-location").addClass("checked");
      }, () => {
        tip("开启分享位置失败...");
      })
    }
    $("button.btn-select-location").removeClass("disabled");
  })

  // 配置保存
  $("button.btn-save").on("click", (e) => {
    $(e.target).addClass("loading");
    const url = $("input.ipt-apiUrl").val();
    $(".panel-setting .form-group").removeClass("has-error has-success");
    $.ajax({
      url: url,
      data: {
        auth: ""
      },
      type: "get",
      timeout: 6000,
      error: () => {
        tip('请求失败，请检查接口地址...');
        $("div.panel-setting .form-group").addClass("has-error");
      },
      success: (res, status) => {
        if (res.code === 0) {
          chrome.storage.local.set({
            'api_url': url,
            'amap_key': res.data.amapKey,
            'tiny_key': res.data.tinyPNGKey
          }, () => {
            $("div.panel-setting button.btn-save").prop("disabled", true);
            $("div.panel-setting .form-group").addClass("has-success");
            tip('校验成功，保存成功...', () => {
              $("div.panel-setting").slideUp()
            })
          })
        } else if (res.code === 1) {
          tip(res.message)
          $("div.panel-setting .form-group").addClass("has-error");
        }
      },
      complete: () => {
        $(e.target).removeClass("loading");
      }
    })
  })

  // 推送碎语
  $('button.btn-push').on('click', (e) => {
    chrome.storage.local.get(["api_url", "latitude", "longitude", "address"], (result) => {
      if (!result.api_url) {
        tip("请先配置碎语 API 地址...");
        return;
      }

      const text = $("textarea[name=text]").val();
      if (imageFile === null && $.trim(text) === "") {
        tip("碎语内容不能为空...");
        return;
      }

      $(e.target).addClass("loading");

      var formData = new FormData();
      formData.append('push', "");
      formData.append('channel', "chrome");
      formData.append('text', text);
      formData.append('image', imageFile);
      if ($(".ipt-hidden-location").is(":checked")) {
        formData.append('x', result.latitude);
        formData.append('y', result.longitude);
        formData.append('address', result.address);
      }

      $.ajax({
        url: result.api_url,
        data: formData,
        type: "post",
        mimeType: "multipart/form-data",
        dataType: "json",
        async: true,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000,
        error: (e) => {
          if (e.statusText === "timeout") {
            tip("发送失败，请求超时...")
          }
        },
        success: (res, status) => {
          insertTag(text)
          if (res.code === 0) {
            $("textarea[name=text]").val("");
            $("div.upload-image img").click();
            tip("发送成功")
          } else {
            tip("发送失败，请重新尝试...")
          }
        },
        complete: () => {
          $(e.target).removeClass("loading");
        }
      })
    })
  })

  // 开始实验性功能
  let inputKeyCode = [];
  $(window).on("keyup", (e) => {
    const cheatsKey = [38, 38, 40, 40, 37, 37, 39, 39, 66, 65, 66, 65];
    inputKeyCode.push(e.keyCode);
    if (inputKeyCode.length > cheatsKey.length) {
      inputKeyCode = inputKeyCode.slice(1, inputKeyCode.length);
    }
    if (inputKeyCode == null || inputKeyCode.length < cheatsKey.length) {
      return;
    }
    const sliceKeyup = inputKeyCode.slice(inputKeyCode.length - cheatsKey.length, inputKeyCode.length);
    for (let i = 0; i < cheatsKey.length; i++) {
      if (cheatsKey[i] !== sliceKeyup[i]) {
        return;
      }
    }
    if ($(".beta").is(":hidden")) {
      chrome.storage.local.set({
        'beta': 'enable'
      }, () => {
        $(".beta").show(() => {
          tip("开启实验性功能...");
        })
      })
    } else {
      chrome.storage.local.set({
        'beta': 'disable',
        'location': 'disable',
        "latitude": null,
        "longitude": null,
        "address": null
      }, () => {
        // 关闭位置分享
        $("input.ipt-hidden-location").prop("checked", false);
        $("button.btn-select-location").removeClass("checked");

        // 关闭图片分享
        $("div.upload-image img").click();
        $(".beta").hide(() => {
          tip("关闭实验性功能...");
        })
      })
    }
  })

  var message = {
    setCaret: function (textObj) {
      if (textObj.createTextRange) {
        textObj.caretPos = document.selection.createRange().duplicate();
      }
    },

    insertAtCaret: function (textObj, textFeildValue) {
      if (document.all) {
        if (textObj.createTextRange && textObj.caretPos) {
          var caretPos = textObj.caretPos;
          caretPos.text = caretPos.text.charAt(caretPos.text.length - 1) == ' ' ? textFeildValue + ' ' : textFeildValue;
        } else {
          textObj.value = textFeildValue;
        }
      } else {
        if (textObj.setSelectionRange) {
          var rangeStart = textObj.selectionStart;
          var rangeEnd = textObj.selectionEnd;
          var tempStr1 = textObj.value.substring(0, rangeStart);
          var tempStr2 = textObj.value.substring(rangeEnd);
          textObj.value = tempStr1 + textFeildValue + tempStr2;
        } else {
          alert("This version of Mozilla based browser does not support setSelectionRange");
        }
      }
    }
  }

  // 提取标签
  function insertTag (text) {
    const tags = text.match(/#{1}[^\s]{1,}(\s|\b)?/g);

    if (tags != null) {
      chrome.storage.local.get(["tags"], (result) => {
        let localTags = result.tags;
        if (!localTags) {
          localTags = [];
        }
        // 遍历新标签
        tags.forEach(tag => {
          const tagName = $.trim(tag.substring(1));
          let newTag = {
            name: tagName,
            cnt: 1
          };
          // 查找老标签
          for (var i in localTags) {
            const hasTag = localTags[i];
            if (hasTag.name === tagName) {
              newTag.cnt = hasTag.cnt + 1;
              localTags.splice(i, 1);
              break;
            }
          }
          localTags.push(newTag);
        });
        chrome.storage.local.set({
          'tags': localTags
        })
      })
    }
  }

  // 移除图片
  $("div.upload-image").on("click", "img", (e) => {
    imageFile = null;
    $(e.target).parent().remove();
  })

  // 插入图片
  function insertImage (src, file) {
    imageFile = file;
    $("div.upload-image").html("").append(
      $("<figure></figure>", {
        "class": "avatar c-hand"
      }).append(
        $("<img>", {
          "src": src,
          "title": "移除"
        })
      )
    )
  }

  // 地图初始化
  function initLocation (success, fail) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((e) => {
        console.log(e.coords.latitude + ", " + e.coords.longitude)
        chrome.storage.local.set({
          "location": "enable",
          "latitude": e.coords.latitude,
          "longitude": e.coords.longitude
        }, () => {
          success()
          chrome.storage.local.get(["amap_key"], (result) => {
            $.ajax({
              url: "https://restapi.amap.com/v3/geocode/regeo?key=" + result.amap_key + "&location=" + e.coords.longitude + "," + e.coords.latitude + "&poitype=&radius=0&extensions=base&batch=false&roadlevel=0",
              success: (res) => {
                console.log("map res > ", res);
                if (res.status == 1) {
                  chrome.storage.local.set({
                    "address": res.regeocode.formatted_address
                  })
                }
              }
            })
          })
        })
      }, (e) => {
        fail()
      }, {
        enableHightAccuracy: true,//高精度
        timeout: 6000,//地址获取超时
        maximumAge: 0
      })
    } else {
      tip("浏览器不支持分享位置...");
    }
  }

  function init () {
    chrome.storage.local.get(["beta", "location"], (result) => {
      if (result.beta === "enable") {
        $(".beta").show();
      }
      if (result.location === "enable") {
        initLocation(() => {
          $("input.ipt-hidden-location").prop("checked", true);
          $("button.btn-select-location").addClass("checked");
        }, () => {

        })
      }
    })
  }
  init()
})