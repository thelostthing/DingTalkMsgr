var id_container = "sub-menu-pannel";
var class_con_item = ["list-item", "conv-item", "context-menu"];
var class_selector_con_item = class_con_item.reduce(function(accu, current){return accu+"."+current},"")
var class_selector_con_item_name = ".conv-item-content .name-wrap .name-title";
var class_selector_con_item_avatar = ".avatar-wrap .group-avatar";
var class_selector_con_item_avatar_bgcolor = ".avatar-wrap .group-avatar .user-avatar[style^='background-color:']";
var class_selector_con_item_avatar_text = ".avatar-wrap .group-avatar .avatar-text";
var class_selector_con_item_avatar_img = ".avatar-wrap .group-avatar [style^='background-image: url(']";
var class_selector_con_item_time = ".conv-item-content .time";
var class_selector_con_item_lastmsg = ".conv-item-content .latest-msg span[ng-bind-html='convItem.conv.lastMessageContent|emoj']";
var class_selector_con_item_lastmsg_emoji = ".conv-item-content .latest-msg span[ng-bind-html='convItem.conv.lastMessageContent|emoj'] .emoji";
var time_wait_load_message = 5000;
var time_wait_debounce_message = 1000;
var template_avatar_noimage = 
`
<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg">
 <!-- Created with Method Draw - http://github.com/duopixel/Method-Draw/ -->
 <g>
  <title>Layer 1</title>
  <rect fill="#{bgColor}" x="0" y="0" width="60" height="60" />
  <text fill="#ffffff" x="30" y="30" font-size="20" font-family="Helvetica, Arial, sans-serif" text-anchor="middle" alignment-baseline="central" xml:space="preserve" font-weight="normal">#{name}</text>
 </g>
</svg>
`;

var showNotificationDebounce = function() {
  var timeout;
  var immediate = false;
  var messages = [];
  var pushMessage = function(mutation) {
    var name = mutation.querySelector(class_selector_con_item_name).innerHTML;
    
    var avatar = null;
    if(mutation.querySelector(class_selector_con_item_avatar_img)) {
      var image_url = window.getComputedStyle(mutation.querySelector(class_selector_con_item_avatar_img)).backgroundImage;
      avatar = image_url.substring(5, image_url.length-2);
    } else {
      var bgcolor = window.getComputedStyle(mutation.querySelector(class_selector_con_item_avatar_bgcolor)).backgroundColor;
      var text = mutation.querySelector(class_selector_con_item_avatar_text).textContent;

      var data = template_avatar_noimage.replace("#{bgColor}", bgcolor).replace("#{name}", text);
      var data_base64 = btoa(unescape(encodeURIComponent(data)));
      avatar = `data:image/svg+xml;base64,${data_base64}`;
    }

    var time = mutation.querySelector(class_selector_con_item_time).innerHTML;

    var lastmsg = mutation.querySelector(class_selector_con_item_lastmsg).innerHTML;
    if(mutation.querySelector(class_selector_con_item_lastmsg_emoji)) {
      var lastmsg_emoji = "";
      var lastmsg_emoji_node = mutation.querySelector(class_selector_con_item_lastmsg).cloneNode(true);
      lastmsg_emoji_node.childNodes.forEach(function(el) {
        if(el.nodeName == "IMG" && el.classList.contains("emoji")) {
          lastmsg_emoji += el.getAttribute("alt");
        } else {
          lastmsg_emoji += el.textContent;
        }
      });
      lastmsg = lastmsg_emoji;
    }

    if(messages.every(function(msg) {return msg.name != name && (msg.time+msg.lastmsg) != (time+lastmsg)})) {
      messages.push({name: name, avatar: avatar, time: time, lastmsg: lastmsg});
      return true;
    } else {
      return false;
    }
  }

  return function executedFunction() {
    var context = this;
    var isUnique = pushMessage(arguments[0]);
    immediate = isUnique;

    var callNow = immediate && !timeout;
    if(callNow) {
      showNotifications.call(context, messages);
      messages.length = 0;
    }
    var later = function() {
      timeout = null;
      if(!immediate) {
        showNotifications.call(context, messages);
        messages.length = 0;
      }
    }
    clearTimeout(timeout);
    timeout = setTimeout(later, time_wait_debounce_message);
  }
}();

function showNotifications(messages) {
  messages.forEach(function(message) {
    chrome.runtime.sendMessage({showNotification: message}, function(showedMessage) {
    });
  })
}

function waitForElement() {
  new MutationObserver(function(mutations) {
    var el = document.getElementById(id_container);
    if(el && el.querySelectorAll(class_selector_con_item).length) {
      this.disconnect();
      setTimeout(function(){monitorElement(el)}, time_wait_load_message);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  })
}
function monitorElement(el) {
  new MutationObserver(function(mutations, observer) {
    var filteredMutationContainers = new Set();
    mutations.forEach(function(mutation) {
      if(mutation.target.offsetParent && class_con_item.every(function(classname) {
        return mutation.target.offsetParent.classList.contains(classname)
      })) {
        filteredMutationContainers.add(mutation.target.offsetParent)
      }
    });

    filteredMutationContainers.forEach(function(container) {
      showNotificationDebounce(container);
    });
  }).observe(el, {
    childList: true,
    subtree: true
  })
}

waitForElement();
