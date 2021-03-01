import { AccountModel } from '../../domain/models/Account'
import { AddAccount, AddAccountModel } from '../../domain/useCases/AddAccount'
import { InvalidParamError, MissingParamError } from '../errors'
import { badRequest, ok, serverError } from '../helpers/httpHelper'
import EmailValidator from '../protocols/EmailValidator'
import { HttpRequest } from '../protocols/Http'
import SignUpController from './SignUpController'

const makeEmailValidator = (): EmailValidator => {
  class EmailValidatorStub implements EmailValidator {
    public isValid (email: string): boolean { return true }
  }

  return new EmailValidatorStub()
}

const makeFakeAccount = (): Omit< AccountModel, 'password' > => ({ id: 'unique_id', name: 'Lucas', email: 'lucastest@gmail.com' })

const makeFakeRequest = (): HttpRequest =>
  ({
    body: {
      name: 'Lucas',
      email: 'lucas@gmail.com',
      password: '12345678',
      password_confirmation: '12345678'
    }
  })

const makeAddAccount = (): AddAccount => {
  class AddAccountStub {
    public async add (account: AddAccountModel): Promise<Omit<AccountModel, 'password'>> {
      return new Promise(resolve => resolve(makeFakeAccount()))
    }
  }

  return new AddAccountStub()
}

interface SutType{
  sut: SignUpController
  emailValidatorStub: EmailValidator
  addAccountStub: AddAccount
}

const makeSut = (): SutType => {
  const emailValidatorStub = makeEmailValidator()
  const addAccountStub = makeAddAccount()
  const sut = new SignUpController(emailValidatorStub, addAccountStub)
  return { sut, emailValidatorStub, addAccountStub }
}

describe('SignUpController', () => {
  test('Should return 400 if name is provided', async () => {
    const { sut } = makeSut()

    const httpRequest = {
      body: {
        email: 'lucassm02@gmail.com',
        password: '12345678',
        password_confirmation: '12345678'
      }
    }

    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse).toEqual(badRequest(new MissingParamError('name')))
  })

  test('Should return 400 if email is provided', async () => {
    const { sut } = makeSut()

    const httpRequest = {
      body: {
        name: 'Lucas',
        password: '12345678',
        password_confirmation: '12345678'
      }
    }

    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse).toEqual(badRequest(new MissingParamError('email')))
  })

  test('Should return 400 if password is provided', async () => {
    const { sut } = makeSut()

    const httpRequest = {
      body: {
        name: 'Lucas',
        email: 'lucastest@gmail.com',
        password_confirmation: '12345678'
      }
    }

    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse).toEqual(badRequest(new MissingParamError('password')))
  })

  test('Should return 400 if password confirmation is provided', async () => {
    const { sut } = makeSut()

    const httpRequest = {
      body: {
        name: 'Lucas',
        email: 'lucastest@gmail.com',
        password: '12345678'
      }
    }

    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse).toEqual(badRequest(new MissingParamError('password_confirmation')))
  })

  test('Should return 400 if an invalid email is provided', async () => {
    const { sut, emailValidatorStub: emailValidator } = makeSut()
    jest.spyOn(emailValidator, 'isValid').mockReturnValueOnce(false)

    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(badRequest(new InvalidParamError('email')))
  })

  test('Should return 400 if password confirmation fails', async () => {
    const { sut, emailValidatorStub: emailValidator } = makeSut()
    jest.spyOn(emailValidator, 'isValid').mockReturnValueOnce(false)

    const httpRequest = {
      body: {
        name: 'Lucas',
        email: 'lucastest@gmail.com',
        password: '12345678',
        password_confirmation: '1234567'
      }
    }

    const httpResponse = await sut.handle(httpRequest)

    expect(httpResponse).toEqual(badRequest(new InvalidParamError('password_confirmation')))
  })

  test('Should return 500 if EmailValidator throws ', async () => {
    const { sut, emailValidatorStub } = makeSut()
    jest.spyOn(emailValidatorStub, 'isValid').mockImplementationOnce(() => { throw new Error() })

    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(serverError(null))
  })

  test('Should return 500 if AddAccount throws ', async () => {
    const { sut, addAccountStub } = makeSut()
    jest.spyOn(addAccountStub, 'add').mockImplementationOnce(async () => {
      return new Promise((resolve, reject) => reject(new Error()))
    })

    const httpResponse = await sut.handle(makeFakeRequest())

    expect(httpResponse).toEqual(serverError(null))
  })

  test('Should call AddAccount with correct values', async () => {
    const { sut, addAccountStub } = makeSut()
    const addSpy = jest.spyOn(addAccountStub, 'add')

    await sut.handle(makeFakeRequest())
    expect(addSpy).toBeCalledWith({
      name: 'Lucas',
      email: 'lucas@gmail.com',
      password: '12345678'
    })
  })

  test('Should call EmailValidator with correct email', async () => {
    const { sut, emailValidatorStub: emailValidator } = makeSut()
    const isValidSpy = jest.spyOn(emailValidator, 'isValid').mockReturnValueOnce(false)

    await sut.handle(makeFakeRequest())
    expect(isValidSpy).toBeCalledWith('lucas@gmail.com')
  })

  test('Should return 200 if valid data is provided', async () => {
    const { sut } = makeSut()
    const httpResponse = await sut.handle(makeFakeRequest())
    expect(httpResponse).toEqual(ok(makeFakeAccount()))
  })
})
