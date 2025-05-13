const host = location.host;
const roomForm = document.querySelector("form#room");

function json(url, init) {
    return fetch(url, init)
        .then(async res => {
            if (res.ok) {
                return { data: await res.json(), error: null };
            }
            throw new Error();
        }).catch(error => ({ data: null, error }));
}

async function joinRoom(maxRoomSize) {
    return json(`https://${host}/api/room/join`, {
        method: "POST",
        body: JSON.stringify({ maxRoomSize }),
        headers: { "content-type": "application/json" }
    });
}

roomForm.onsubmit = async e => {
    e.preventDefault();
    const formData = new FormData(roomForm);

    const maxRoomSize = Number(formData.get("maxRoomSize"));
    if (Number.isNaN(maxRoomSize)) {
        alert("Invalid room size");
        return;
    }
    
    const submitBtn =  roomForm.querySelector('button[type="submit"]');
    submitBtn.setAttribute("disabled", "");

    const { data, error } = await joinRoom(maxRoomSize);
    if (error !== null) {
        alert(error.message);
    } else {
        location.href = `/room/${data.room.id}`;
    }
    submitBtn.removeAttribute("disabled");
};

