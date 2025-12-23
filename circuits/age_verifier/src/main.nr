fn main(birth_year: u16, current_year: pub u16, min_age: pub u16) {
    let age = current_year - birth_year;
    assert(age >= min_age);
}
