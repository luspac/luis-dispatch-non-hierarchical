const { BotFrameworkAdapter, MemoryStorage, ConversationState } = require('botbuilder');
const restify = require('restify');
const { QnAMaker, LuisRecognizer } = require('botbuilder-ai');

// Create server
let server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create adapter
const adapter = new BotFrameworkAdapter({ 
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD 
});


//Questions to ask to trigger the Qna Maker 
// - what type of light bulb do I need?
// -  how long does the light's battery last for?
// -  why doe the light not work?
// - who should I contact for customer service? 


const qna = new QnAMaker({
    knowledgeBaseId: '0c6042ff-df37-4afd-9bbb-498fca2aab84',
    subscriptionKey: '502bcb0ed0ce46d8bd62f604ab10e1fa',
    top: 1
});

// Intents to type in to trigger Luis
// - On, Turn on, Turn light on etc..
// -Off, Turn off, Turn light off etc..

const model = new LuisRecognizer({
    appId: 'd8e21056-8167-4213-8cc0-09cf17f2ca9a',
    subscriptionKey: '5aabb5acf8884bd5a923cda41ec7894c',
    serviceEndpoint: 'https://westus.api.cognitive.microsoft.com'
});

adapter.use(model);

// Add conversation state middleware
const conversationState = new ConversationState(new MemoryStorage());
adapter.use(conversationState);


// Listen for incoming requests 
server.post('/api/messages', (req, res) => {
    // Route received request to adapter for processing
    adapter.processActivity(req, res, async (context) => {
        if (context.activity.type === 'message') {
            const results = model.get(context);
            switch (LuisRecognizer.topIntent(results)) {
                // Use 'None' as the QnA fallback intent
                case 'None':
                    var handled = await qna.answer(context)
                    if (handled) {
                        await context.sendActivity(handled);
                        break;
                    }
                    else {
                        await context.sendActivity(`No KB article found.`);
                        break;
                    }
                case 'Turn off the light':
                    await context.sendActivity("you want to turn off the light");
                    break;
                case 'Turn on the light':
                    await context.sendActivity("you want to turn on the light");
                    break;
                default:
                    await context.sendActivity("this is the default, qna is the backup");
                    break;
            }
        }
    });
});

