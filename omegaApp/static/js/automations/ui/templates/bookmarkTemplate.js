export function getBookmarkInstructionsHTML() {
    return `
        <ol>
            <li>
                <p>פתח את סרגל הסימניות בדפדפן שלך (על ידי לחיצה על Ctrl+Shift+B).</p>
            </li>
            <li>
                <p>לחץ לחיצה ימנית על סרגל הסימניות ובחר "הוסף דף".</p>
            </li>
            <li>
                <p>בשדה "שם", הזן שם לסימניה (לדוגמה: "סיסמאות").</p>
            </li>
            <li>
                <p>בשדה "כתובת אתר", העתק והדבק את קוד ה-JavaScript הבא:</p>
            </li>
        </ol>
        
        <div class="code-container">
            <textarea id="pre-code">${getBookmarkCode()}</textarea>
            <button id="code-btn" type="button" onclick="copyCode()">
                העתק קוד
            </button>
        </div>

        <ol start="5">
            <li>
                <p>לחץ על "שמור" כדי להוסיף את הסימניה.</p>
            </li>
            <li>
                <p>👍</p>
            </li>
        </ol>
    `;
}

export function getBookmarkCode() {
    return `javascript: (function () {
            var accounts = [


                //    ➡➡➡➡➡➡    פה ניתן להוסיף סיסמאות לפי הפורמט    ⬅⬅⬅⬅⬅⬅
                { name: '1970', username: 'admin', password: 'Central1970' },
                { name: '2017', username: 'admin', password: 'Central2017' },
                { name: 'ADST', username: 'admin', password: 'adstadst' },
                { name: 'omega', username: 'omega', password: 'omega' }
            ];
        



            function createSelector() {
                var selector = document.createElement('div');
        
                var  accountsContainer= document.createElement('div');
                accountsContainer.style.display = 'flex';
                selector.appendChild(accountsContainer);
        
                selector.style.position = 'fixed';
                selector.style.display = 'flex';
                selector.style.alignItems= "center";
                selector.style.gap = '1rem';
                selector.style.top = '20px';
                selector.style.left = '20px';
                selector.style.backgroundColor = 'white';
                selector.style.border = '1px solid black';
                selector.style.padding = '10px';
                selector.style.zIndex = '9999';
                accounts.forEach(function (account, index) {
                    var button = document.createElement('button');
                    button.textContent = account.name;
                    button.style.display = 'block';
                    button.style.margin = '5px';
                    button.style.width = '100%';
                    button.style.minWidth = 'auto';
                    button.onclick = function () {
                        fillCredentials(account);
                        document.body.removeChild(selector);
                        autoSubmit();
                    };
                    
                    if(button.textContent == "דומיין"){
                        button.style.border=  "1px solid rgb(4, 159, 217)";
                    }
                    if(button.textContent == "ADST"){
                        button.style.border=  "1px solid #00B388";
                    }
                    if(button.textContent == "סביבת ניסוי"){
                        button.style.border=  "1px solid red";
                    }
                    accountsContainer.appendChild(button);
                });
                
                var closeButton = document.createElement('button');
                closeButton.textContent = 'X';
                closeButton.style.display = 'block';
                closeButton.style.margin = '5px';
                closeButton.style.width = '4rem';
                closeButton.style.height = '4rem';
                closeButton.style.minWidth = 'auto';
                closeButton.style.borderRadius = "50%";
                closeButton.onclick = function () {
                    document.body.removeChild(selector);
                };
                selector.appendChild(closeButton);
        
                document.body.appendChild(selector);
            }
        
            function fillCredentials(account) {
                let inputs = [];
        
                var iframes = document.getElementsByTagName("iframe");
                if (iframes.length > 0) {
                    inputs = iframes[0].contentDocument.querySelectorAll("input");
        
                } else {
                    inputs = document.getElementsByTagName("input");
                }
        
                for (var i = 0; i < inputs.length; i++) {
                    if (inputs[i].type.toLowerCase() === 'text' ||
                        inputs[i].type.toLowerCase() === 'email' ||
                        inputs[i].name.toLowerCase() === 'usernameinput' ||
                        inputs[i].name.toLowerCase().indexOf('user') !== -1) {
                        inputs[i].value = account.username;
                    }
                    if (inputs[i].type.toLowerCase() === 'password' || inputs[i].name.toLowerCase() === 'passwordinput') {
                        inputs[i].value = account.password;
                    }
                }
            }
        
            function autoSubmit() {
                var possibleSubmitButtons = [];
                var iframes = document.getElementsByTagName("iframe");
                let formButton;
        
                if (iframes.length > 0) {
                    possibleSubmitButtons = iframes[0].contentDocument.querySelectorAll('button, input[type="button"], a');
                    formButton = iframes[0].contentDocument.getElementsByTagName("form");
                } else {
                    possibleSubmitButtons = document.querySelectorAll('button, input[type="button"], a');
                    formButton = document.getElementsByTagName("form");
                }
        
                if (formButton) {
                    simulateEnterKey(iframes[0]);
                } else if (possibleSubmitButtons) {
                    for (var i = 0; i < possibleSubmitButtons.length; i++) {
                        var buttonText = possibleSubmitButtons[i].textContent.toLowerCase();
                        if (buttonText.includes('login') || buttonText.includes('log in') || buttonText.includes('sign in') || buttonText.includes('submit')) {
                            possibleSubmitButtons[i].click();
                        }
                    }
                }
            }
            
            function simulateEnterKey(iframe) {
                var enterKeyEvent = new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: 'Enter',
                    keyCode: 13,
                    which: 13
                });
        
                let inputs = [];
                if (iframe) {
                    inputs = iframe.contentDocument.querySelectorAll("input");
                } else {
                    inputs = document.getElementsByTagName("input");
                }
                var lastInput = inputs[inputs.length - 2];
                if (lastInput) {
                    lastInput.focus();
                    lastInput.dispatchEvent(enterKeyEvent);
                    console.log("enter");
                } else {
                    lastInput.focus();
                    document.dispatchEvent(enterKeyEvent);
                    console.log("enter");
                }
            }
        
            createSelector();
        })();`;
} 