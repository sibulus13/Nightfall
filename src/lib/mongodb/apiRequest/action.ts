'use server'

import ApiRequest from './model'
import { type IApiSchema } from './model'

interface apiRequest {
    email: string
}

const addApiRequest = async (request: apiRequest) => {
    const email = request.email
    try {
        const newApiRequest = new ApiRequest({ email }) as IApiSchema
        await newApiRequest.save()
        return {
            message: 'You have signed up for the API waitlist!',
        }
    } catch (error) {
        if ((error as { code?: number })?.code === 11000) { // duplicate key error code
            console.log('You have already signed up for the API waitlist!')
            return {
                message: 'You have already signed up for the API waitlist!',
            }
        } else {
            console.log('Error adding API request:', error)
            return {
                message: 'Error adding API request',
            }
        }
    }
}

export { addApiRequest }