function showModal(message, showCancel) {
    return new Promise((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.classList.add('modal-dialog');

        const p = document.createElement('p');
        p.textContent = message;
        dialog.appendChild(p);

        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.addEventListener('click', () => dialog.close('ok'));
        buttons.appendChild(okButton);

        if (showCancel) {
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', () => dialog.close('cancel'));
            buttons.appendChild(cancelButton);
        }

        dialog.appendChild(buttons);
        document.body.appendChild(dialog);
        dialog.addEventListener('close', () => {
            const result = dialog.returnValue === 'ok';
            dialog.remove();
            resolve(result);
        });
        dialog.showModal();
    });
}

function showModalAlert(message) {
    return showModal(message, false).then(() => {});
}

function showModalConfirm(message) {
    return showModal(message, true);
}

window.showModalAlert = showModalAlert;
window.showModalConfirm = showModalConfirm;
