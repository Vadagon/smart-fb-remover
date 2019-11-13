var user = {
    uid: false,
    creds: false,
    loading: true,
    friends: []
};


function getAccessTocken(data) {
    catcher(()=>{user.uid = data.split('USER_ID\\":\\"')[1].split('\\",')[0]})
    catcher(()=>{user.uid = data.split('\\"uid\\":')[1].split(',')[0]})

    const config = {};
    let o = data.match(/accessToken\\":\\"([^\\]+)/);
    let t = {};
    config.access_token = o[1];
    let n = data.match(/{\\"dtsg\\":{\\"token\\":\\"([^\\]+)/);
    config.dt = n[1];
    let r = data.match(/\\"NAME\\":\\"([^"]+)/);
    r = r[1].slice(0, -1).replace(/\\\\/g, "\\");
    r = decodeURIComponent(JSON.parse(`"${r}"`));
    config.name = r;
    return config;
}
function getCreds(cb){
    return new Promise(async (resolve) => {
        let url = 'https://m.facebook.com/composer/ocelot/async_loader/?publisher=feed';
        let response = await fetch(url);
        let text = await response.text();

        user.creds = getAccessTocken(text);

        cb&&cb()
        resolve()
    });
}

async function start() {
    user.loading = true;
    
    await getCreds()

    await $.get(`https://graph.facebook.com/v3.0/me/friends?limit=5000&access_token=${user.creds.access_token}`).done((data)=>{
        catcher(()=>{
            if(data.data.length) user.friends = data.data
        })
    })

    var messageThreads = [];
    function loadMessages(beforeId){
        $.ajax({
          type: "POST",
          dataType: "text",
          url: 'https://www.facebook.com/api/graphqlbatch/',
          data: 'batch_name=MessengerGraphQLThreadlistFetcher&__user='+user.uid+'&__a=1&fb_dtsg='+user.creds.dt+'&queries='
          // +'{"o0":{"doc_id":"2150199688342867","query_params":{"threadFBID":"2989873611040546"}}}'
          // +'{"o0":{"doc_id":"2559420730762099","query_params":{"limit":500, "tags":["INBOX"],"isWorkUser":false,"includeDeliveryReceipts":false,"includeSeqID":false,"is_work_teamwork_not_putting_muted_in_unreads":false}}}'
          +'{"o0":{"doc_id":"2559420730762099","query_params":{"limit":500,'+ (beforeId?('"before":'+beforeId+','):'') +'"tags":["INBOX"],"isWorkUser":false,"includeDeliveryReceipts":false,"includeSeqID":false,"is_work_teamwork_not_putting_muted_in_unreads":false}}}'
        }).done(function( data ) {
            // console.log(data)
            var afterId;
            catcher(()=>{
                var d = JSON.parse(data.split('\n')[0]);
                if(d.o0.data.viewer.message_threads.nodes.length){
                    messageThreads.push(...d.o0.data.viewer.message_threads.nodes)
                    afterId = d.o0.data.viewer.message_threads.nodes.pop().updated_time_precise;
                }

                if(!d.o0.data.viewer.message_threads.nodes.length)
                    throw 'no messages nodes';
            })?loadMessages(afterId):parseMessageFeed(messageThreads)
        }).fail(()=>{
            parseMessageFeed(messageThreads)
        })
    }
    loadMessages()


}

function parseMessageFeed(messages){
    // console.log('friends array: ', user.friends)
    // console.log('messages: ', messages)
    messages.forEach(function(thread){
        var time = parseInt(thread.updated_time_precise)
        var members = thread.all_participants.edges.map(e=>e.node.messaging_actor.id)
        var i = 0;
        user.friends.some(e=>{
            if(members.includes(e.id)){
                if(!e.time || e.time < thread.updated_time_precise) e.time = time
                i++;
            }
            if(i >= members.length) return true;
            else return false;
        })
    })
    user.loading = false;
}

function catcher(f){
    try{
        f()
        return true;
    }catch(err){
        console.log(err)
        return false;
    }
}



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.type == 'data'){
        getCreds(()=>{
            sendResponse(user)
        });
    }
    if(request.type == 'start')
        start()
    
    return true;
});


chrome.browserAction.onClicked.addListener(function (e) {
    chrome.tabs.create({url: chrome.extension.getURL("index.html")})
}.bind(this));


chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.requestHeaders[i].name === 'Origin') {
                details.requestHeaders[i].value = "https://www.facebook.com";
            }
        }
        return {requestHeaders: details.requestHeaders};
    },
    {urls: ['*://*.facebook.com/*']},
    ['blocking', 'requestHeaders']
);


 

setInterval(function(){
    start()
}, 1000*60*60*8)


start()