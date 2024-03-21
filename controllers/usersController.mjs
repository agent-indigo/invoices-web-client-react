import 'dotenv/config'
import {compare, hash} from 'bcryptjs'
import jwt from 'jsonwebtoken'
import asyncHandler from '../middleware/asyncHandler.mjs'
import createToken from '../utilities/createToken.mjs'
import userModel from '../models/userModel.mjs'
/**
 * @name    login
 * @desc    Log in a user
 * @route   POST /api/users/login
 * @access  public
 */
export const login = (async (request, response) => {
    const {name, password} = request.body
    const user = await userModel.findOne({where: {name, password}})
    const isCorrect = await compare(password, user.shadow)
    if (!user || !isCorrect) {
        response.status(401)
        throw new Error('Invalid credentials.')
    } else {
        response.status(202).json({
            name: user.name,
            role: user.role,
            token: createToken(response, user.pk)
        })
    }
})
/**
 * @name    logout
 * @desc    Log out the current user
 * @route   GET /api/users/logout
 * @access  private
 */
export const logout = (request, response) => {
    response.clearCookie('token')
    response.status(200).json({message: 'Logged out.'})
}
/**
 * @name    changePassword
 * @desc    Change the current user's password
 * @route   PATCH /api/users/changePassword
 * @access  private
 */
export const changePassword = asyncHandler(async(request, response) => {
    const token = request.cookies.token || request.header('Authorization').substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const {currentPassword, newPassword, confirmNewPassword} = request.body
    const user = await userModel.findByPk(decoded.pk)
    const isCorrect = await compare(currentPassword, user.shadow)
    if (!isCorrect) {
        response.status(401)
        throw new Error('Incorrect password.')
    } else if (newPassword !== confirmNewPassword) {
        response.status(403)
        throw new Error('New passwords do not match.')
    } else {
        const newShadow = await hash(newPassword, 10)
        user.shadow = newShadow
        await user.save()
        response.status(202).json({message: 'Password changed.'})
    }
})
/**
 * @name    resetPassword
 * @desc    Change a user's password
 * @route   PATCH /api/users/:pk
 * @access  private/root
 */
export const resetPassword = asyncHandler(async (request, response) => {
    const token = request.cookies.token || request.header('Authorization').substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const {newPassword} = request.body
    const currentUser = await userModel.findByPk(decoded.pk)
    const user = await userModel.findByPk(request.params.pk)
    if (currentUser.pk === user.pk) {
        response.status(403)
        throw new Error('You can\'t change your own password this way.')
    } else {
        const newShadow = await hash(newPassword, 10)
        user.shadow = newShadow
        await user.save()
        response.status(202).json({message: 'Password changed.'})
    }
})
/**
 * @name    addUser
 * @desc    Add a new user
 * @route   POST /api/users
 * @access  private/root
 */
export const addUser = asyncHandler(async (request, response) => {
    const {name, password, confirmPassword} = request.body
    if (password !== confirmPassword) {
        response.status(403)
        throw new Error('Passwords do not match.')
    } else {
        const shadow = await hash(password, 10)
        await userModel.create({
            name,
            shadow,
            role: 'user'
        })
        response.status(201).json({message: 'Created new user.'})
    }
})
/**
 * @name    listUsers
 * @desc    List all users
 * @route   GET /api/users
 * @access  private/root
 */
export const listUsers = asyncHandler(async (request, response) => {
    const users = await userModel.findAll({
        attributes: {
            exclude: ['shadow']
        }
    })
    response.status(200).json(users)
})
/**
 * @name    deleteUser
 * @desc    Delete a user
 * @route   DELETE /api/users/:pk
 * @access  private/root
 */
export const deleteUser = asyncHandler(async (request, response) => {
    const user = await userModel.findByPk(request.params.pk)
    if (user.role === 'root') {
        response.status(403)
        throw new Error('The root user shouldn\'t be deleted.')
    } else {
        await user.destroy()
        response.status(204).json({message: 'Deleted user.'})
    }
})