Action - How
Open a chat - POST /chat/conversations with { mentorId, userId } → get conversationId
Load history - GET /chat/conversations/:conversationId/messages?limit=20 — paginate older with ?cursor=<lastId>
List all chats - GET /chat/conversations/:userId
Real-time - Connect socket, emit join_conversation with conversationId
Send message - Emit send_message, listen for new_message broadcast
Typing indicator - Emit typing with { conversationId, userId, isTyping: true/false }
Mark read - Emit read_receipt or PATCH /chat/conversations/:id/read 