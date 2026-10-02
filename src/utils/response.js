const response = (res, statusCode, message, data) => {
    return res
        .status(statusCode)
        .json({
            statusCode,
            status: statusCode < 400 ? 'success' : 'failed',
            message,
            data
        })
}

export default response