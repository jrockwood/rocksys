/// <reference types="jasmine" />

declare namespace jasmine {
  interface ArrayLikeMatchers<T> {
    toHaveSameItems(expected: Expected<ArrayLike<T>>, expectationFailOutput?: any): boolean;
  }
}
