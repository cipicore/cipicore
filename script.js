/* =========================================
   PIN LOCK
========================================= */

const CIPICORE_PIN = "333555";

function unlockCipiCore() {

    const pinInput =
        document.getElementById("pinInput");

    const pinError =
        document.getElementById("pinError");

    const pinScreen =
        document.getElementById("pinScreen");

    const appContent =
        document.getElementById("appContent");

    if (pinInput.value === CIPICORE_PIN) {

        pinScreen.style.display = "none";
        appContent.style.display = "block";

        pinInput.value = "";
        pinError.textContent = "";

    } else {

        pinError.textContent =
            "PIN-nya salah, dek!";

        pinInput.value = "";
        pinInput.focus();

    }
}

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const appContent =
            document.getElementById(
                "appContent"
            );

        appContent.style.display =
            "none";

        document
            .getElementById("pinInput")
            .focus();

    }
);

/* =========================================
   CIPICORE DATA
========================================= */

const SUPABASE_URL = "https://dshbuciwnsrmcklpcqlk.supabase.co";
const SUPABASE_KEY = "sb_publishable_FTts5W5BoF3gRGwhzBnYUA_qrKCj3OY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let accounts = [];


let transactions = [];


let editingAccountId = null;

let transactionFilter = "all";

let sortNewestFirst = true;


/* =========================================
   LOAD DATA
========================================= */

async function loadAccounts() {

    const { data, error } =
        await supabaseClient
            .from("accounts")
            .select("*")
            .order("id", {
                ascending: true
            });

    if (error) {
        console.error(
            "Gagal mengambil accounts:",
            error
        );

        alert(
            "Gagal mengambil data account: " +
            error.message
        );

        return;
    }

    accounts = data.map(account => ({
        id: account.id,
        username: account.username || "",
        displayName: account.display_name || "",
        email: account.email || "",
        subscriptionStart: account.renew_plus || "",
        renewMode: "automatic",
        manualRenew: "",
        firstSend: account.first_send || "",
        lastSend: account.last_send || "",
        robux: Number(account.robux || 0)
    }));

    renderAccounts();
    updateDashboard();
}

async function loadTransactions() {

    const { data, error } =
        await supabaseClient
            .from("transactions")
            .select("*")
            .order("date", {
                ascending: false
            });

    if (error) {
        console.error(
            "Gagal mengambil transactions:",
            error
        );

        alert(
            "Gagal mengambil data transaksi: " +
            error.message
        );

        return;
    }

    transactions = data.map(item => ({
        id: item.id,
        date: item.date,
        type: item.type,
        category: item.category,
        accountId: item.account_id,
        robux: Number(item.robux || 0),
        amount: Number(item.amount || 0),
        method: item.method || "",
        note: item.note || ""
    }));

    refreshTransactions();
    updateDashboard();
}


/* =========================================
   CURRENCY
========================================= */

function formatRupiah(number) {

    return "Rp " +
        Number(number || 0)
            .toLocaleString("id-ID");

}


/* =========================================
   DATE
========================================= */

function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const date =
        new Date(dateString + "T00:00:00");


    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


function toDateInputValue(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/*
    Menambahkan bulan tanpa membuat
    tanggal menjadi rusak.

    Contoh:
    31 Januari → 28 Februari
    31 Maret → 30 April
*/

function addMonthsClamped(
    date,
    months
) {

    const result =
        new Date(date);

    const originalDay =
        result.getDate();


    result.setDate(1);

    result.setMonth(
        result.getMonth() + months
    );


    const lastDay =
        new Date(
            result.getFullYear(),
            result.getMonth() + 1,
            0
        ).getDate();


    result.setDate(
        Math.min(
            originalDay,
            lastDay
        )
    );


    return result;

}


/* =========================================
   NEXT AVAILABLE
========================================= */

function calculateNextAvailable(
    lastSend
) {

    if (!lastSend) {
        return null;
    }


    const lastDate =
        new Date(
            lastSend + "T00:00:00"
        );


    /*
        Last Send:
        12 Agustus

        Bulan berikut:
        12 September

        + 1 hari:
        13 September
    */

    const next =
        addMonthsClamped(
            lastDate,
            1
        );


    next.setDate(
        next.getDate() + 1
    );


    return toDateInputValue(next);

}


/* =========================================
   RENEW PLUS
========================================= */

function calculateAutomaticRenew(
    startDate
) {

    if (!startDate) {
        return null;
    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const original =
        new Date(
            startDate + "T00:00:00"
        );


    let renew =
        new Date(original);


    while (renew <= today) {

        renew =
            addMonthsClamped(
                renew,
                1
            );

    }


    return toDateInputValue(
        renew
    );

}


/* =========================================
   NAVIGATION
========================================= */

function showPage(
    page,
    button
) {

    document
        .querySelectorAll(".page")
        .forEach(
            function(element) {

                element.classList.remove(
                    "active-page"
                );

            }
        );


    document
        .getElementById(
            page + "Page"
        )
        .classList.add(
            "active-page"
        );


    document
        .querySelectorAll(".nav-button")
        .forEach(
            function(element) {

                element.classList.remove(
                    "active"
                );

            }
        );


    button.classList.add("active");


    if (page === "dashboard") {

        renderAccounts();

        updateDashboard();

    }


    if (page === "transactions") {

        refreshTransactions();

    }

}


/* =========================================
   ACCOUNT MODAL
========================================= */

function openAccountModal(
    accountId = null
) {

    editingAccountId =
        accountId;


    const modal =
        document.getElementById(
            "accountModal"
        );


    modal.classList.add("show");


    if (accountId) {

        const account =
            accounts.find(
                function(item) {

                    return Number(item.id) ===
                        Number(accountId);

                }
            );


        if (!account) {
            return;
        }


        document.getElementById(
            "accountModalTitle"
        ).textContent =
            "Edit Account";


        document.getElementById(
            "accountUsername"
        ).value =
            account.username;


        document.getElementById(
            "accountDisplayName"
        ).value =
            account.displayName;


        document.getElementById(
            "accountEmail"
        ).value =
            account.email;


        document.getElementById(
            "accountSubscriptionStart"
        ).value =
            account.subscriptionStart || "";


        document.getElementById(
            "accountRenewMode"
        ).value =
            account.renewMode || "auto";


        document.getElementById(
            "accountManualRenew"
        ).value =
            account.manualRenew || "";


        document.getElementById(
            "accountFirstSend"
        ).value =
            account.firstSend || "";


        document.getElementById(
            "accountLastSend"
        ).value =
            account.lastSend || "";


        document.getElementById(
            "accountRobux"
        ).value =
            account.robux || "";

    } else {

        document.getElementById(
            "accountModalTitle"
        ).textContent =
            "Add Account";


        document
            .querySelector(
                "#accountModal form"
            )
            .reset();

    }


    updateManualRenewVisibility();

}


function closeAccountModal() {

    document
        .getElementById(
            "accountModal"
        )
        .classList.remove(
            "show"
        );


    editingAccountId = null;

}


function updateManualRenewVisibility() {

    const mode =
        document.getElementById(
            "accountRenewMode"
        ).value;


    const group =
        document.getElementById(
            "manualRenewGroup"
        );


    group.style.display =
        mode === "manual"
            ? "flex"
            : "none";

}


document
    .getElementById(
        "accountRenewMode"
    )
    .addEventListener(
        "change",
        updateManualRenewVisibility
    );


/* =========================================
   SAVE ACCOUNT
========================================= */

    async function saveAccount(event) {
         event.preventDefault();

    const account = {
        id:
            editingAccountId
                ? Number(editingAccountId)
                : Date.now(),

        username:
            document.getElementById(
                "accountUsername"
            ).value.trim(),

        display_name:
            document.getElementById(
                "accountDisplayName"
            ).value.trim(),

        email:
            document.getElementById(
                "accountEmail"
            ).value.trim(),

        renew_plus:
            document.getElementById(
                "accountSubscriptionStart"
            ).value,

        first_send:
            document.getElementById(
                "accountFirstSend"
            ).value || null,

        last_send:
            document.getElementById(
                "accountLastSend"
            ).value || null,

        robux:
            Number(
                document.getElementById(
                    "accountRobux"
                ).value
            ) || 0
    };

    const renewMode =
        document.getElementById(
            "accountRenewMode"
        ).value;

    const manualRenew =
        document.getElementById(
            "accountManualRenew"
        ).value;

    if (
        renewMode === "manual" &&
        !manualRenew
    ) {
        alert(
            "Isi tanggal Next Renew Manual."
        );
        return;
    }

    // EDIT ACCOUNT
    if (editingAccountId) {

        const { data, error } =
            await supabaseClient
                .from("accounts")
                .update({
                    username: account.username,
                    display_name: account.display_name,
                    email: account.email,
                    renew_plus: account.renew_plus,
                    first_send: account.first_send,
                    last_send: account.last_send,
                    robux: account.robux
                })
                .eq(
                    "id",
                    Number(editingAccountId)
                )
                .select()
                .single();

        if (error) {
            console.error(error);
            alert(
                "Gagal update account: " +
                error.message
            );
            return;
        }

    }

    // ADD ACCOUNT
    else {

        const { data, error } =
            await supabaseClient
                .from("accounts")
                .insert({
                    id: account.id,
                    username: account.username,
                    display_name: account.display_name,
                    email: account.email,
                    renew_plus: account.renew_plus,
                    first_send: account.first_send,
                    last_send: account.last_send,
                    robux: account.robux
                })
                .select()
                .single();

        if (error) {
            console.error(error);
            alert(
                "Gagal menambahkan account: " +
                error.message
            );
            return;
        }
    }

    await loadAccounts();

    closeAccountModal();
    renderAccounts();
    updateDashboard();
}



/* =========================================
   RENDER ACCOUNTS
========================================= */

function renderAccounts() {

    const table =
        document.getElementById(
            "accountsTable"
        );


    const search =
        document.getElementById(
            "accountSearch"
        )
        .value
        .toLowerCase()
        .trim();


    const filtered =
        accounts.filter(
            function(account) {

                return (

                    account.username
                        .toLowerCase()
                        .includes(search)

                    ||

                    account.displayName
                        .toLowerCase()
                        .includes(search)

                    ||

                    account.email
                        .toLowerCase()
                        .includes(search)

                );

            }
        );


    document.getElementById(
        "accountCount"
    ).textContent =
        accounts.length;


    if (filtered.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="9">

                    <div class="empty-state">

                        <strong>
                            Belum ada akun
                        </strong>

                        Tambahkan akun dengan
                        tombol + Add Account.

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    table.innerHTML =
        filtered.map(
            function(account) {

                let renewDate;


                if (
                    account.renewMode ===
                    "manual"
                ) {

                    renewDate =
                        account.manualRenew;

                } else {

                    renewDate =
                        calculateAutomaticRenew(
                            account.subscriptionStart
                        );

                }


                const nextAvailable =
                    calculateNextAvailable(
                        account.lastSend
                    );


                return `

                    <tr>

                        <td class="username">
                            ${escapeHtml(account.username)}
                        </td>


                        <td>
                            ${escapeHtml(account.displayName)}
                        </td>


                        <td class="muted">
                            ${escapeHtml(account.email)}
                        </td>


                        <td>
                            ${
                                renewDate
                                    ? formatDate(renewDate)
                                    : "-"
                            }
                        </td>


                        <td>
                            ${
                                account.firstSend
                                    ? formatDate(account.firstSend)
                                    : "-"
                            }
                        </td>


                        <td>
                            ${
                                account.lastSend
                                    ? formatDate(account.lastSend)
                                    : "-"
                            }
                        </td>


                        <td>

                            ${
                                nextAvailable
                                    ? `
                                        <span class="badge badge-mauve">
                                            ${formatDate(nextAvailable)}
                                        </span>
                                      `
                                    : "-"
                            }

                        </td>


                        <td class="robux-value">

                            ${Number(account.robux || 0)
                                .toLocaleString("id-ID")}
                            R$

                        </td>


                        <td>

                            <div class="action-cell">

                                <button
                                    class="icon-button"
                                    onclick="openAccountModal('${account.id}')"
                                >
                                    ✎
                                </button>


                                <button
                                    class="icon-button"
                                    onclick="deleteAccount('${account.id}')"
                                >
                                    ×
                                </button>

                            </div>

                        </td>

                    </tr>

                `;

            }
        )
        .join("");

}


/* =========================================
   DELETE ACCOUNT
========================================= */

function deleteAccount(id) {

    const account =
        accounts.find(
            function(item) {

                return item.id === id;

            }
        );


    if (!account) {
        return;
    }


    if (
        !confirm(
            `Hapus akun ${account.username}?`
        )
    ) {

        return;

    }


    accounts =
        accounts.filter(
            function(item) {

                return Number(item.id) !== Number(id);

            }
        );


    saveData();

    renderAccounts();

    updateDashboard();

}


/* =========================================
   TRANSACTION MODAL
========================================= */

function openTransactionModal() {

    document
        .getElementById(
            "transactionModal"
        )
        .classList.add("show");


    document
        .querySelector(
            "#transactionModal form"
        )
        .reset();


    document.getElementById(
        "transactionDate"
    ).value =
        toDateInputValue(
            new Date()
        );


    populateTransactionAccounts();

    updateTransactionCategory();

}


function closeTransactionModal() {

    document
        .getElementById(
            "transactionModal"
        )
        .classList.remove(
            "show"
        );

}


/* =========================================
   TRANSACTION CATEGORY
========================================= */

function updateTransactionCategory() {

    const type =
        document.getElementById(
            "transactionType"
        ).value;


    const category =
        document.getElementById(
            "transactionCategory"
        );


    if (type === "income") {

        category.innerHTML = `

            <option value="sale">
                Penjualan
            </option>

            <option value="refund">
                Refund
            </option>

            <option value="other">
                Lainnya
            </option>

        `;

    } else {

        category.innerHTML = `

            <option value="robux">
                Beli Robux
            </option>

            <option value="subscription">
                Subscribe Plus
            </option>

            <option value="other">
                Lainnya
            </option>

        `;

    }

}


/* =========================================
   ACCOUNT DROPDOWN
========================================= */

function populateTransactionAccounts() {

    const select =
        document.getElementById(
            "transactionAccount"
        );


    select.innerHTML = `

        <option value="">
            Tidak terkait akun
        </option>

    `;


    accounts.forEach(
        function(account) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                account.id;


            option.textContent =
                account.username;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================
   SAVE TRANSACTION
========================================= */

async function saveTransaction(event) {

    event.preventDefault();

    const transaction = {
        id: Date.now(),

        date:
            document.getElementById(
                "transactionDate"
            ).value,

        type:
            document.getElementById(
                "transactionType"
            ).value,

        category:
            document.getElementById(
                "transactionCategory"
            ).value,

        account_id:
            document.getElementById(
                "transactionAccount"
            ).value
                ? Number(
                    document.getElementById(
                        "transactionAccount"
                    ).value
                )
                : null,

        robux:
            Number(
                document.getElementById(
                    "transactionRobux"
                ).value
            ) || 0,

        amount:
            Number(
                document.getElementById(
                    "transactionAmount"
                ).value
            ) || 0,

        method:
            document.getElementById(
                "transactionMethod"
            ).value,

        note:
            document.getElementById(
                "transactionNote"
            ).value.trim()
    };


    const { error } =
        await supabaseClient
            .from("transactions")
            .insert(transaction);


    if (error) {

        console.error(
            "Gagal menyimpan transaksi:",
            error
        );

        alert(
            "Gagal menyimpan transaksi: " +
            error.message
        );

        return;
    }


    await loadTransactions();

    closeTransactionModal();

    refreshTransactions();

    updateDashboard();

}


/* =========================================
   TRANSACTION FILTER
========================================= */

function setTransactionType(
    type,
    button
) {

    transactionFilter =
        type;


    document
        .querySelectorAll(
            ".filter-button"
        )
        .forEach(
            function(element) {

                element.classList.remove(
                    "active"
                );

            }
        );


    button.classList.add(
        "active"
    );


    refreshTransactions();

}


/* =========================================
   SORT
========================================= */

function toggleSort() {

    sortNewestFirst =
        !sortNewestFirst;


    document.getElementById(
        "sortButton"
    ).textContent =
        sortNewestFirst
            ? "Tanggal ↓"
            : "Tanggal ↑";


    refreshTransactions();

}


/* =========================================
   FILTERED TRANSACTIONS
========================================= */

function getFilteredTransactions() {

    const from =
        document.getElementById(
            "dateFrom"
        ).value;


    const to =
        document.getElementById(
            "dateTo"
        ).value;


    let filtered =
        transactions.filter(
            function(transaction) {

                if (
                    transactionFilter !==
                    "all"
                    &&
                    transaction.type !==
                    transactionFilter
                ) {

                    return false;

                }


                if (
                    from &&
                    transaction.date < from
                ) {

                    return false;

                }


                if (
                    to &&
                    transaction.date > to
                ) {

                    return false;

                }


                return true;

            }
        );


    filtered.sort(
        function(a, b) {

            if (sortNewestFirst) {

                return b.date.localeCompare(
                    a.date
                );

            }


            return a.date.localeCompare(
                b.date
            );

        }
    );


    return filtered;

}


/* =========================================
   RENDER TRANSACTIONS
========================================= */

function renderTransactions() {

    const table =
        document.getElementById(
            "transactionsTable"
        );


    const filtered =
        getFilteredTransactions();


    if (filtered.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="9">

                    <div class="empty-state">

                        <strong>
                            Tidak ada transaksi
                        </strong>

                        Belum ada transaksi
                        yang sesuai filter.

                    </div>

                </td>

            </tr>

        `;

        document.getElementById(
            "transactionCount"
        ).textContent =
            "0 transaksi";


        document.getElementById(
            "filteredProfit"
        ).textContent =
            "Profit Rp 0";


        updateTransactionSummary();

        return;

    }


    table.innerHTML =
        filtered.map(
            function(transaction) {

                const account =
                    accounts.find(
                        function(item) {

                            return item.id ===
                                transaction.accountId;

                        }
                    );


                const typeLabel =
                    transaction.type ===
                    "income"
                        ? "Pemasukan"
                        : "Pengeluaran";


                const categoryLabels = {

                    sale: "Penjualan",

                    refund: "Refund",

                    robux: "Beli Robux",

                    subscription:
                        "Subscribe Plus",

                    other: "Lainnya"

                };


                const category =
                    categoryLabels[
                        transaction.category
                    ] ||
                    transaction.category;


                return `

                    <tr>

                        <td>
                            ${formatDate(transaction.date)}
                        </td>


                        <td>

                            <span class="
                                badge
                                ${
                                    transaction.type ===
                                    "income"
                                        ? "badge-income"
                                        : "badge-expense"
                                }
                            ">

                                ${typeLabel}

                            </span>

                        </td>


                        <td>
                            ${escapeHtml(category)}
                        </td>


                        <td class="username">

                            ${
                                account
                                    ? escapeHtml(
                                        account.username
                                    )
                                    : "-"
                            }

                        </td>


                        <td class="robux-value">

                            ${
                                transaction.robux
                                    ? Number(
                                        transaction.robux
                                    ).toLocaleString(
                                        "id-ID"
                                    ) + " R$"
                                    : "-"
                            }

                        </td>


                        <td>

                            ${formatRupiah(
                                transaction.amount
                            )}

                        </td>


                        <td>

                            <span class="badge badge-good">

                                ${escapeHtml(
                                    transaction.method
                                )}

                            </span>

                        </td>


                        <td class="muted">

                            ${escapeHtml(
                                transaction.note ||
                                "-"
                            )}

                        </td>


                        <td>

                            <button
                                class="icon-button"
                                onclick="deleteTransaction('${transaction.id}')"
                            >
                                ×
                            </button>

                        </td>

                    </tr>

                `;

            }
        )
        .join("");


    document.getElementById(
        "transactionCount"
    ).textContent =
        `${filtered.length} transaksi`;


    const filteredIncome =
        filtered
            .filter(
                item =>
                    item.type ===
                    "income"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


    const filteredExpense =
        filtered
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


    const profit =
        filteredIncome -
        filteredExpense;


    document.getElementById(
        "filteredProfit"
    ).textContent =
        `Profit ${formatRupiah(profit)}`;


    updateTransactionSummary();

}


/* =========================================
   TRANSACTION SUMMARY
========================================= */

function updateTransactionSummary() {

    const filtered =
        getFilteredTransactions();


    const income =
        filtered
            .filter(
                item =>
                    item.type ===
                    "income"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


    const expense =
        filtered
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


    const profit =
        income -
        expense;


    const robuxBought =
        filtered
            .filter(
                item =>
                    item.type ===
                        "expense" &&
                    item.category ===
                        "robux"
            )
            .reduce(
                (sum, item) =>
                    sum + item.robux,
                0
            );


    document.getElementById(
        "totalIncome"
    ).textContent =
        formatRupiah(income);


    document.getElementById(
        "totalExpense"
    ).textContent =
        formatRupiah(expense);


    document.getElementById(
        "totalProfit"
    ).textContent =
        formatRupiah(profit);


    document.getElementById(
        "totalRobuxBought"
    ).textContent =
        Number(
            robuxBought
        ).toLocaleString(
            "id-ID"
        ) + " R$";

}


/* =========================================
   DELETE TRANSACTION
========================================= */

async function deleteTransaction(id) {

    if (
        !confirm(
            "Hapus transaksi ini?"
        )
    ) {
        return;
    }

    const { error } =
        await supabaseClient
            .from("transactions")
            .delete()
            .eq(
                "id",
                Number(id)
            );

    if (error) {
        console.error(
            "Gagal menghapus transaksi:",
            error
        );

        alert(
            "Gagal menghapus transaksi: " +
            error.message
        );

        return;
    }

    await loadTransactions();

    refreshTransactions();
    updateDashboard();
}


/* =========================================
   DASHBOARD CALCULATIONS
========================================= */

function updateDashboard() {

    const income =
        transactions
            .filter(
                item =>
                    item.type ===
                    "income"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


    const expense =
        transactions
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .reduce(
                (sum, item) =>
                    sum + item.amount,
                0
            );


    const profit =
        income -
        expense;


    /*
        Untuk sementara saldo = profit.

        Nanti kita bisa tambahkan
        "Saldo Awal" supaya:

        Saldo =
        Saldo Awal
        + Pemasukan
        - Pengeluaran
    */


    const balance =
        profit;


    const totalRobux =
        accounts.reduce(
            (sum, account) =>
                sum +
                Number(
                    account.robux || 0
                ),
            0
        );


    document.getElementById(
        "dashboardBalance"
    ).textContent =
        formatRupiah(balance);


    document.getElementById(
        "dashboardIncome"
    ).textContent =
        formatRupiah(income);


    document.getElementById(
        "dashboardExpense"
    ).textContent =
        formatRupiah(expense);


    document.getElementById(
        "dashboardProfit"
    ).textContent =
        formatRupiah(profit);


    document.getElementById(
        "dashboardRobux"
    ).textContent =
        Number(
            totalRobux
        ).toLocaleString(
            "id-ID"
        ) + " R$";

}


/* =========================================
   REFRESH TRANSACTIONS
========================================= */

function refreshTransactions() {

    renderTransactions();

    updateTransactionSummary();

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   CLOSE MODAL OUTSIDE
========================================= */

window.addEventListener(
    "click",
    function(event) {

        const accountModal =
            document.getElementById(
                "accountModal"
            );


        const transactionModal =
            document.getElementById(
                "transactionModal"
            );


        if (
            event.target ===
            accountModal
        ) {

            closeAccountModal();

        }


        if (
            event.target ===
            transactionModal
        ) {

            closeTransactionModal();

        }

    }
);


/* =========================================
   INITIALIZE
========================================= */

async function initApp() {
    await loadAccounts();
    await loadTransactions();

    updateDashboard();
    updateManualRenewVisibility();
}

initApp();