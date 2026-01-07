// src/utils/functions/validateFields.ts 
export const validateFields = (fields: any) => {
    let isValid = true;
    for (const field of fields) {
        if (
            !validateField(
                field.state,
                field.setState,
                field.message,
                field.conditions
            )
        )
            isValid = false;
    }
    return isValid;
};

const validateField = (
    state: any,
    setState: any,
    message: any,
    options: any = []
) => {
    let errorMessage = '';
    if (!state.value.toString().trim()) errorMessage = message;
    if (!errorMessage) {
        for (const opt of options) {
            if (!opt.condition) {
                errorMessage = opt.message || message;
                break;
            }
        }
    }
    setState({
        ...state,
        error: errorMessage || 'success'
    });
    return errorMessage ? false : true;
};
