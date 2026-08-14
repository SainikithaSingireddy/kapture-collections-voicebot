const express = require("express");

const customers = {
    "ACC-88392": {
        name: "Rahul Sharma",
        verificationCode: "1234",
        amount: 8499,
        dueDate: "2026-08-01",
        daysOverdue: 12,
        phone: "+919876543210"
    }
};

const sessions = {};

function getSession(accountId) {
    return sessions[accountId];
}

function updateState(accountId, newState) {
    if (!sessions[accountId]) {
        return false;
    }

    sessions[accountId].state = newState;
    return true;
}

const app = express();

app.use(express.json());

app.post("/webhook", (req, res) => {
    console.log("Webhook request received:");
    console.log(req.body);

    const { tool, account_id, verification_code } = req.body;

    if (tool === "verify_customer") {
        const customer = customers[account_id];

        if (!customer) {
            return res.json({
                verified: false,
                message: "Customer account not found."
            });
        }

        if (verification_code === customer.verificationCode) {
            sessions[account_id] = {
                authenticated: true,
                state: "AUTHENTICATED"
            };

            return res.json({
                verified: true,
                customer_name: customer.name,
                state: "AUTHENTICATED",
                message: "Identity verified successfully."
            });
        }

        return res.json({
            verified: false,
            message: "Verification failed. Incorrect verification information."
        });
    }

    if (tool === "get_account_details") {
        const session = sessions[account_id];

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before accessing account details."
            });
        }

        const customer = customers[account_id];

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        return res.json({
            success: true,
            customer_name: customer.name,
            amount: customer.amount,
            due_date: customer.dueDate,
            days_overdue: customer.daysOverdue
        });
    }

    if (tool === "start_negotiation") {
        const session = getSession(account_id);

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before negotiation."
            });
        }

        if (session.state !== "AUTHENTICATED") {
            return res.status(400).json({
                success: false,
                message: `Cannot start negotiation from ${session.state} state.`
            });
        }

        updateState(account_id, "NEGOTIATION");

        return res.json({
            success: true,
            state: "NEGOTIATION",
            message: "Payment negotiation started."
        });
    }

    if (tool === "log_promise_to_pay") {
        const session = getSession(account_id);

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before making a payment promise."
            });
        }

        if (session.state !== "AUTHENTICATED" && session.state !== "NEGOTIATION") {
            return res.status(400).json({
                success: false,
                message: `Cannot log a payment promise while conversation is in ${session.state} state.`
            });
        }

        updateState(account_id, "PTP_COLLECTED");

        return res.json({
            success: true,
            state: "PTP_COLLECTED",
            message: "Promise to pay recorded successfully."
        });
    }

    if (tool === "send_payment_link") {
        const { channel } = req.body;
        const session = getSession(account_id);

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before requesting a payment link."
            });
        }

        if (session.state !== "AUTHENTICATED" && session.state !== "NEGOTIATION") {
            return res.status(400).json({
                success: false,
                message: `Cannot send payment link while conversation is in ${session.state} state.`
            });
        }

        return res.json({
            success: true,
            channel: channel,
            message: `Payment link sent successfully via ${channel} to registered mobile number.`
        });
    }



    if (tool === "mark_disposition") {
        const { status, notes } = req.body;
        const session = getSession(account_id);

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before marking a disposition."
            });
        }

        if (session.state !== "PTP_COLLECTED") {
            return res.status(400).json({
                success: false,
                message: `Cannot mark disposition while conversation is in ${session.state} state.`
            });
        }

        return res.json({
            success: true,
            disposition_logged: status,
            notes: notes || "",
            timestamp: new Date().toISOString()
        });
    }

    if (tool === "end_call") {
        const session = getSession(account_id);

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before ending the call."
            });
        }

        if (session.state !== "PTP_COLLECTED") {
            return res.status(400).json({
                success: false,
                message: `Call cannot be ended from ${session.state} state.`
            });
        }

        updateState(account_id, "CALL_ENDED");

        return res.json({
            success: true,
            state: "CALL_ENDED",
            message: "Call completed successfully."
        });
    }

    if (tool === "escalate_to_agent") {
        const { reason, notes } = req.body;
        const session = getSession(account_id);

        if (!session || !session.authenticated) {
            return res.status(403).json({
                success: false,
                message: "Customer must be authenticated before escalation."
            });
        }

        if (session.state === "CALL_ENDED") {
            return res.status(400).json({
                success: false,
                message: "Cannot escalate a call that has already ended."
            });
        }

        const ticketId = `TICKET-${Math.floor(1000 + Math.random() * 9000)}`;

        updateState(account_id, "ESCALATED");

        return res.json({
            success: true,
            ticket_id: ticketId,
            reason: reason,
            notes: notes || "",
            state: "ESCALATED",
            message: "Case escalated to a human agent."
        });
    }



    return res.status(400).json({
        success: false,
        message: "Unknown tool"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Kapture Mock Server running on port ${PORT}`);
});