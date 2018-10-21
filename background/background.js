var regex_url_dingtalk = /^https:\/\/im\.dingtalk\.com\//;
var time_wait_check_foucus = 1000;
var isDingTalkPageFocused = false;

var getNotificationOptions = function() {
  return {
    type: "list",
    title: null,
    message: "",
    items: null,
    iconUrl: null || "../assets/images/get_started16.png",
    imageUrl: null,
    requireInteraction: true,
    isClickable: true,
    eventTime: Date.now(),
    contextMessage: "https://im.dingtalk.com/",
    buttons: [
      {title: 'Clear All'},
      {title: 'Check'}
    ]
  }
}
var showedNotifications = [];

function clearAllNotifications() {
  var unClearedNotifications = [];
  showedNotifications.forEach(function(notification, i) {
    chrome.notifications.clear(notification.id, function(wasCleared) {
      if(!wasCleared) {
        unClearedNotifications.push(notification);
      }
      if(i == showedNotifications.length - 1) {
        showedNotifications = unClearedNotifications;
      }
    });
  });
}

function showNotification(message) {
  
  var showedNotification = showedNotifications.find(function(notification) {
    return notification.title == message.name;
  })

  if(showedNotification) {
    var updateOptions = {
      items: showedNotification.items.concat([
        {
          title: message.time,
          message: message.lastmsg
        }
      ])
    }
    chrome.notifications.update(showedNotification.id, updateOptions, function(wasUpdated) {
      if(wasUpdated) {
        for(var i = 0, len = showedNotifications.length; i < len; i ++) {
          if(showedNotifications[i].id == showedNotification.id) {
            showedNotifications[i].items = updateOptions.items;
            break;
          }
        }
      }
    })
  } else {
    var options = getNotificationOptions();

    options.title = message.name;
    options.iconUrl = message.avatar || options.iconUrl;
    options.items = [
      {
        title: message.time,
        message: message.lastmsg
      }
    ];
    chrome.notifications.create(options, function(notificationId) {
      showedNotifications.push({
        id: notificationId,
        title: options.title,
        items: options.items
      })
    })
  }
}


chrome.notifications.onClicked.addListener(function(notificationId) {
  chrome.notifications.clear(notificationId, function(wasCleared) {
    if(wasCleared) {
      var index_cleared = showedNotifications.findIndex(function(showedNotification) {
        return showedNotification.id == notificationId;
      });
      if(index_cleared > -1) {
        showedNotifications.splice(index_cleared, 1);
      }
    }
  });
});
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
  if(buttonIndex == 1) {
    // jump to dingtalk
    chrome.tabs.query({}, function(tabs) {
      var dingtalkTab;
      for(var i = 0, len = tabs.length; i < len; i ++) {
        if(regex_url_dingtalk.test(tabs[i].url)) {
          dingtalkTab = tabs[i];
          break;
        }
      }
      chrome.windows.update(dingtalkTab.windowId, {focused: true, drawAttention: false})
      chrome.tabs.update(dingtalkTab.id, {active: true}, function(tab) {
        clearAllNotifications();
      });
    })
  } else if(buttonIndex == 0) {
    clearAllNotifications();
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if(regex_url_dingtalk.test(sender.tab.url)) {
    if(request.showNotification && !isDingTalkPageFocused) {
      showNotification(request.showNotification);
      sendResponse(request.showNotification);
    } else if(request.clearAllNotifications) {
      clearAllNotifications();
    }
  }
});

function checkBrowserFocus() {
  chrome.windows.getLastFocused(function(window) {
    if(!window.focused) {
      isDingTalkPageFocused = false;
    } else {
      chrome.tabs.query({windowId: window.id, active: true}, function(tabs) {
        var dingtalkTab;
        for(var i = 0, len = tabs.length; i < len; i ++) {
          if(regex_url_dingtalk.test(tabs[i].url)) {
            dingtalkTab = tabs[i];
            break;
          }
        }
        if(dingtalkTab) {
          isDingTalkPageFocused = true;
          clearAllNotifications();
        } else {
          isDingTalkPageFocused = false;
        }
      })
    }
  })
}
setInterval(checkBrowserFocus, time_wait_check_foucus);

chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {hostEquals: 'im.dingtalk.com'},
    })
    ],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

chrome.runtime.onInstalled.addListener(function() {
  // test
})
