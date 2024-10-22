let handleMemberJoined = async (memberId) => {
    addMemberToDom(memberId);
    let members = await channel.getMembers();
    UpdateMemberTotal(members);
    let { name } = await rtmClient.getUserAttributesByKeys(memberId, ["name"]);
    addBotMessageToDom(`👋 welcome ${name} to the room`);
};

let addMemberToDom = async (memberId) => {
    let { name } = await rtmClient.getUserAttributesByKeys(memberId, ["name"]);
    let membersContainer = document.getElementById('member__list');
    let memberItem = `
        <div class="member__wrapper" id="member__${memberId}__wrapper">
            <span class="green__icon"></span>
            <p class="member_name">${name}</p>
        </div>`;
    membersContainer.insertAdjacentHTML('beforeend', memberItem);
};

let handleMemberLeft = async (memberId) => {
    removeMemberFromDom(memberId);
    let members = await channel.getMembers();
    UpdateMemberTotal(members);
};

let UpdateMemberTotal = async (members) => {
    let totalMembers = document.getElementById('members__count');
    totalMembers.innerText = members.length;
};

let removeMemberFromDom = (memberId) => {
    let memberItem = document.getElementById(`member__${memberId}__wrapper`);
    let name=document.getElementsByClassName('member_name')[0].textContent;
    if (memberItem) memberItem.remove();
    addBotMessageToDom(`${name} has leave the room`);
};

let getMembers = async () => {
    let members = await channel.getMembers();
    UpdateMemberTotal(members);
    members.forEach(member => {
        addMemberToDom(member);
    });
};

// Handle incoming channel message
let handleChannelMessage = async (message, memberId) => {
    let data = JSON.parse(message.text);

    if (data.type === 'chat') {
        addMessageToDom(data.message, data.displayName);
    }
   

    if (data.type === 'user_left') {
        document.getElementById(`user-container-${data.uid}`).remove();
    }

};

// Add message to the DOM
let addMessageToDom = (message, author) => {
    let messagesContainer = document.getElementById('messages');
    let messageItem = `
                    <div class="message__wrapper">
                    
                        <div class="message__body">
                            <strong class="message__author">${author}</strong>  
                            <p class="message__text"> ${message} </p>
                        </div>
                    </div>`;
    messagesContainer.insertAdjacentHTML('beforeend', messageItem);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;  // Auto-scroll to the bottom
};
let addBotMessageToDom = (botMessage) => {
    let messagesContainer = document.getElementById('messages');
    let messageItem = ` <div class="message__wrapper">
                        <div class="message__body__bot">
                            <strong class="message__author__bot">🤖 Aniss Chat Bot</strong>
                            <p class="message__text__bot">${botMessage}</p>
                        </div>
                    </div> `;
    messagesContainer.insertAdjacentHTML('beforeend', messageItem);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;  // Auto-scroll to the bottom
};
// Send message when form is submitted or icon is clicked
let SendMessage = async (e) => {
    e.preventDefault();
    let messageInput = e.target.message.value.trim();

    if (messageInput !== "") {
        await channel.sendMessage({
            text: JSON.stringify({ 'type': 'chat', 'message': messageInput, 'displayName': displayName })
        });
        addMessageToDom(messageInput, 'You');  // Show sent message in the chat
        e.target.message.value = "";  // Clear input field
    }
};

// Leave channel on window unload
let leaveChannel = async () => {
    await channel.leave();
    await rtmClient.logout();
};

// Event listeners
window.addEventListener("beforeunload", leaveChannel);

let sendMessageForm = document.getElementById('message__form');
sendMessageForm.addEventListener('submit', SendMessage);

// Add functionality for the Send Icon click event (if separate from form submission)
let sendButton = document.getElementById('sendButton');
sendButton.addEventListener('click', (e) => {
    e.preventDefault();
    let messageInput = document.getElementById('messageInput');
    let event = new Event('submit');  // Trigger form submit
    sendMessageForm.dispatchEvent(event);
});
