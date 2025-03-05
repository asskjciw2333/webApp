class MessageFormatter {
    formatMessage(text) {
        // First, let's handle the markdown elements that generate HTML
        text = this.handleImages(text);
        text = this.handleCodeBlocks(text);
        text = this.handleInlineCode(text);
        text = this.handleTables(text);
        text = this.handleServerResults(text);
        text = this.handleLists(text);
        text = this.handleBlockquotes(text);
        text = this.handleBasicFormatting(text);
        
        return text;
    }

    handleImages(text) {
        return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
            return `<img src="${url}" alt="${alt}" onclick="document.querySelector('.image-preview').innerHTML = '<img src=\\'${url}\\' alt=\\'${alt}\\'>'; document.querySelector('.image-preview').classList.add('active');">`;
        });
    }

    handleCodeBlocks(text) {
        return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
            language = language || 'plaintext';
            return `<pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>`;
        });
    }

    handleInlineCode(text) {
        return text.replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    handleTables(text) {
        const tables = [];
        text = text.replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
            const headers = header.split('|').filter(cell => cell.trim());
            const tableRows = rows.trim().split('\n').map(row => 
                row.split('|').filter(cell => cell.trim())
            );

            const tableHtml = `<table>
                <thead>
                    <tr>${headers.map(h => `<th>${h.trim()}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${tableRows.map(row => 
                        `<tr>${row.map(cell => `<td>${cell.trim()}</td>`).join('')}</tr>`
                    ).join('')}
                </tbody>
            </table>`;
            
            const placeholder = `__TABLE_PLACEHOLDER_${tables.length}__`;
            tables.push(tableHtml);
            return placeholder;
        });

        // Restore tables after other processing
        tables.forEach((table, index) => {
            text = text.replace(`__TABLE_PLACEHOLDER_${index}__`, table);
        });

        return text;
    }

    handleServerResults(text) {
        const serverResults = [];
        text = text.replace(/__SERVER_RESULT_PLACEHOLDER__(.*?)__END_SERVER_RESULT__/g, (match, content) => {
            const placeholder = `__SERVER_RESULT_PLACEHOLDER_${serverResults.length}__`;
            serverResults.push(content);
            return placeholder;
        });

        // Restore server results after other processing
        serverResults.forEach((result, index) => {
            text = text.replace(`__SERVER_RESULT_PLACEHOLDER_${index}__`, result);
        });

        return text;
    }

    handleLists(text) {
        text = text.replace(/^[\s-]*([•\-*]) (.+)$/gm, '<li>$2</li>');
        text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        return text;
    }

    handleBlockquotes(text) {
        return text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    }

    handleBasicFormatting(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n{2,}/g, '<br>')
            .replace(/\n/g, '<br>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    formatActionResult(result) {
        if (typeof result === 'string') {
            return result;
        }
        
        if (Array.isArray(result)) {
            return this.formatArrayResult(result);
        }
        
        if (typeof result === 'object') {
            return this.formatObjectResult(result);
        }
        
        return String(result);
    }

    formatArrayResult(result) {
        if (result.length > 0 && typeof result[0] !== 'object') {
            return `<ul>${result.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
        return JSON.stringify(result, null, 2);
    }

    formatObjectResult(result) {
        try {
            if (result.data && (result.data.name || result.data.dn)) {
                return this.formatServerResult(result);
            }
            return JSON.stringify(result, null, 2);
        } catch (error) {
            return Object.entries(result)
                .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                .join('\n');
        }
    }

    formatServerResult(result) {
        if (!result.data) return JSON.stringify(result, null, 2);
        
        const data = result.data;
        return `<div class="server-result">
            <div class="server-result-header">
                <h3>${data.usr_lbl || data.name || 'Server Information'}</h3>
                <span class="server-status ${result.status}">${result.status || 'unknown'}</span>
            </div>
            <table class="server-details">
                <tbody>
                    ${data.name ? `<tr><td>Name</td><td>${data.name}</td></tr>` : ''}
                    ${data.dn ? `<tr><td>DN</td><td>${data.dn}</td></tr>` : ''}
                    ${data.domain ? `<tr><td>Domain</td><td>${data.domain}</td></tr>` : ''}
                    ${data.serial ? `<tr><td>Serial</td><td>${data.serial}</td></tr>` : ''}
                    ${data.version ? `<tr><td>Version</td><td>${data.version}</td></tr>` : ''}
                </tbody>
            </table>
        </div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default MessageFormatter; 