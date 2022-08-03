export type Subscriber<T> = (data: T) => void;
export type Constructable<T> = { new (): T };

interface PubSub<T> {
  subscribe(onSubscribe: (value: T) => void): void;

  publish(value: T): void;
}

export class PubSubImpl<T> implements PubSub<T> {
  #subscribers = new Set<(value: T) => void>();

  public subscribe(
    callback: (value: T) => void,
  ) {
    this.#subscribers.add(callback);
  }

  public publish(value: T) {
    const subs = this.#subscribers;
    subs.forEach((s) => s(value));
  }
}
