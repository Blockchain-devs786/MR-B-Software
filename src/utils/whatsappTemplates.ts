
export const getWhatsAppMessage = (order: any, status: string): string => {
    const customerName = order.customer_name || 'Customer';
    const orderId = String(order.id).padStart(5, '0');
    const total = Number(order.total).toFixed(0);
    const address = order.delivery_address || 'Address not provided';
    const riderName = order.rider_name || 'Our Rider';
    const type = order.type;

    let message = '';

    switch (status) {
        case 'Pending':
            if (type === 'Delivery') {
                message = `Hello ${customerName}!\n\n• We have received your order #${orderId}.\n\n• Total amount: Rs ${total}\n• Delivery address: ${address}\n• Your rider: ${riderName}\n\n• Your order is now being prepared for delivery. We will keep you updated!\n\nThank you for choosing us.\n— Mr B`;
            } else {
                message = `Hello ${customerName}!\n\n• We have received your order #${orderId}.\n\n• Total: Rs ${total}\n• Type: Takeaway\n\n• Your order is being prepared now. We will notify you as soon as it is ready for pickup!\n\nThank you for your order.\n— Mr B`;
            }
            break;

        case 'Preparing':
            message = `Hello ${customerName}!\n\n• Good news! Your order #${orderId} is currently being prepared in our kitchen.\n\n• We will send you another message as soon as it is ready. Thank you for your patience!\n\n— Mr B`;
            break;

        case 'Ready':
            if (type === 'Delivery') {
                message = `Hello ${customerName}!\n\n• Your order #${orderId} is out for delivery!\n\n• Rider: ${riderName}\n\n• It should arrive at your address shortly. Thank you for ordering with us!\n\n— Mr B`;
            } else {
                message = `Hello ${customerName}!\n\n• Your order #${orderId} is ready for pickup!\n\n• Total: Rs ${total}\n\n• Please come and collect at your convenience. We look forward to serving you again!\n\n— Mr B`;
            }
            break;

        case 'Completed':
            if (order.payment_status === 'Pending') {
                message = `Hello ${customerName}!\n\n• Your order #${orderId} has been delivered.\n\n• Pending payment: Rs ${total}\n\n• Please complete the payment at your earliest convenience. Thank you for your trust!\n\n— Mr B`;
            } else {
                message = `Hello ${customerName}!\n\n• Your order #${orderId} is complete!\n\n• Total paid: Rs ${total}\n\n• Thank you so much for choosing Mr B. We hope you enjoyed your order and look forward to serving you again soon!\n\n— Mr B`;
            }
            break;

        default:
            message = `Hello ${customerName}!\n\n• Update on your order #${orderId}.\n\n• Current status: ${status}\n\n• If you have any questions, feel free to reach out. Thank you!\n\n— Mr B`;
    }

    return encodeURIComponent(message);
};
