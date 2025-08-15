//validation function for register
export const signupValidation = (data) => {
    let errors = {};

    if (!data.firstName) {
        errors.firstName = "First Name Is Required."
    }

    if (!data.lastName) {
        errors.lastName = "Last Name Is Required."
    }

    if (!data.email) {
        errors.email = "Email Is Required."
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
        errors.email = "Invalid Email"
    }
    if (!data.password) {
        errors.password = "Password is required."
    } else if (data.password.length < 6) {
        errors.password = "Password must be more than six characters"
    }

    if (!data.passwordConfirm) {
        errors.passwordConfirm = "Confirm Password is required."
    } else if (data.passwordConfirm !== data.password) {
        errors.passwordConfirm = "Password must be match"
    }

    return errors;
}