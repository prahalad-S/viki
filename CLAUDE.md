@AGENTS.md

be default i want to use chatbox without entering my api keys for groq, nvidia and openrouter in UI

inside bottom left corner of the textarea of chatbox:
add options side by side like:

1. general
2. text to image

by default activate the general for llm response and we can switch to text to image when we need to generate image.
in the chatmessage component: if mode is text to image then render it.

use my keys of groq, openrouter, openai, clerk for general chat.
when user swtiches to text to image mode then use nvidia api key.

but also show the models to users to select when they switch between modes. 

and keep 'AI Provider Settings' as it is at top right corner for logged in users to add their keys to use the chatbox if once my keys tokens are finished. when token are finished show a pop up message to all logged in users 'you ran out of free usage, add you own api keys to use chatbox' with 'OK' button to close the pop up message. 



